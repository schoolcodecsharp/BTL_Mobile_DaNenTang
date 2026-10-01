// Real HTTP + MySQL. Creates and drops ONLY a uniquely named test database.
require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const mysql = require('mysql2/promise');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Teams API with real MySQL', { timeout: 120000 }, async t => {
  const database = `todo_groups_test_${randomBytes(8).toString('hex')}`;
  assert.match(database, /^todo_groups_test_[a-f0-9]{16}$/);
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || 'your_password',
  });
  let models, server, created = false;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    process.env.DB_NAME = database;
    models = require('../../models');
    const { sequelize, NguoiDung, Nhom, ThanhVienNhom, CongViecNhom, PhienDangNhap } = models;
    function migrateGroups() {
    const migration = spawnSync(process.execPath,
      [path.resolve(__dirname, '../../scripts/run-migrations.js'), 'db:migrate'],
      { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'development', DB_NAME: database } });
    assert.equal(migration.status, 0, migration.stderr || migration.stdout);
    }
    migrateGroups();
    const app = require('../../server');
    server = await new Promise(resolve => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = async (method, path, token, body) => {
      const response = await fetch(base + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const raw = await response.text();
      return { status: response.status, body: raw ? JSON.parse(raw) : null };
    };
    const expect = async (method, path, token, body, status) => {
      const response = await request(method, path, token, body);
      assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(response.body)}`);
      return response.body;
    };
    const accounts = [];
    await t.test('register/login issues persisted tokens, invalid credentials rejected', async () => {
      for (const username of ['owner', 'member', 'outsider', 'viewer']) {
        const user = await expect('POST', '/api/auth/register', null, { username, email: `${username}@example.com`, password: 'TestPassword123!', fullName: username }, 200);
        const login = await expect('POST', '/api/auth/login', null, { usernameOrEmail: username, password: 'TestPassword123!' }, 200);
        assert.equal(login.id, user.id);
        assert.match(login.accessToken, /^[a-f0-9]{64}$/);
        assert.equal(login.tokenType, 'Bearer');
        assert.ok(new Date(login.expiresAt) > new Date());
        const stored = await PhienDangNhap.findOne({ where: { nguoi_dung_id: user.id } });
        assert.notEqual(stored.token_hash, login.accessToken);
        accounts.push({ ...user, token: login.accessToken });
      }
      await expect('POST', '/api/auth/login', null, { usernameOrEmail: 'owner', password: 'wrong' }, 401);
      await expect('POST', '/api/auth/login', null, { usernameOrEmail: [], password: {} }, 400);
      await expect('POST', '/api/auth/register', null, { username: 12, email: [], password: {} }, 400);
    });
    const [owner, member, outsider, viewer] = accounts;
    let teamId, taskId, otherTeamId;
    await t.test('authentication, forged identity and malformed inputs', async () => {
      await expect('GET', '/api/teams', null, undefined, 401);
      await expect('GET', '/api/teams', 'a'.repeat(64), undefined, 401);
      await expect('GET', `/api/teams?userId=${owner.id}`, outsider.token, undefined, 403);
      await expect('POST', '/api/teams', outsider.token, { tenNhom: 'Forged', userId: owner.id }, 403);
      for (const tenNhom of ['', ' ', 'a'.repeat(101), 123, [], {}]) {
        await expect('POST', '/api/teams', owner.token, { tenNhom }, 400);
      }
      await expect('POST', '/api/teams', owner.token, [], 400);
      await expect('GET', '/api/teams/1abc', owner.token, undefined, 400);
      await expect('GET', '/api/teams/2147483647', owner.token, undefined, 404);
    });
    await t.test('create/list/detail/update and outsider isolation', async () => {
      const team = await expect('POST', '/api/teams', owner.token, { tenNhom: ' Nhóm Mobile ', moTa: 'Đồ án' }, 201);
      teamId = team.id;
      assert.equal(team.tenNhom, 'Nhóm Mobile');
      assert.equal(team.truongNhomId, owner.id);
      assert.equal(team.thanhViens.length, 1);
      assert.equal(team.thanhViens[0].vaiTro, 'TRUONG_NHOM');
      assert.equal(JSON.stringify(team).includes('mat_khau'), false);
      assert.equal((await expect('GET', '/api/teams', owner.token, undefined, 200)).length, 1);
      assert.deepEqual(await expect('GET', '/api/teams', outsider.token, undefined, 200), []);
      await expect('GET', `/api/teams/${teamId}`, outsider.token, undefined, 403);
      await expect('PUT', `/api/teams/${teamId}`, outsider.token, { tenNhom: 'Hack' }, 403);
      await expect('DELETE', `/api/teams/${teamId}`, outsider.token, undefined, 403);
      await expect('PUT', `/api/teams/${teamId}`, owner.token, { tenNhom: 'Nhóm đã sửa' }, 204);
      const detail = await expect('GET', `/api/teams/${teamId}`, owner.token, undefined, 200);
      assert.equal(detail.tenNhom, 'Nhóm đã sửa');
      otherTeamId = (await expect('POST', '/api/teams', outsider.token, { tenNhom: 'Other' }, 201)).id;
    });
    await t.test('add members, concurrent duplicates, missing/disabled accounts', async () => {
      await expect('POST', `/api/teams/${teamId}/invite`, outsider.token, { inviteEmail: member.email }, 403);
      await expect('POST', `/api/teams/${teamId}/invite`, owner.token, { inviteEmail: 'invalid' }, 400);
      await expect('POST', `/api/teams/${teamId}/invite`, owner.token, { inviteEmail: 'absent@example.com' }, 404);
      await NguoiDung.update({ trang_thai: false }, { where: { id: viewer.id } });
      await expect('POST', `/api/teams/${teamId}/invite`, owner.token, { inviteEmail: viewer.email }, 404);
      await NguoiDung.update({ trang_thai: true }, { where: { id: viewer.id } });
      const results = await Promise.all([1, 2].map(() => request('POST', `/api/teams/${teamId}/invite`, owner.token, { inviteEmail: member.email })));
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      assert.equal(await ThanhVienNhom.count({ where: { nhom_id: teamId, nguoi_dung_id: member.id } }), 1);
      await expect('POST', `/api/teams/${teamId}/invite`, member.token, { inviteEmail: viewer.email }, 403);
      await expect('POST', `/api/teams/${teamId}/invite`, owner.token, { inviteEmail: viewer.email }, 201);
      assert.equal((await expect('GET', `/api/teams/${teamId}`, member.token, undefined, 200)).thanhViens.length, 3);
    });
    await t.test('assignment validation and role permissions', async () => {
      const path = `/api/teams/${teamId}/tasks`;
      await expect('POST', path, member.token, { tieuDe: 'Task' }, 403);
      for (const payload of [
        { tieuDe: 7 }, { tieuDe: 'a'.repeat(201) }, { tieuDe: 'Task', mucDoUuTien: 'BAD' },
        { tieuDe: 'Task', nguoiNhanId: outsider.id }, { tieuDe: 'Task', nguoiNhanId: '2abc' },
        { tieuDe: 'Task', hanHoanThanh: 'bad-date' }, { tieuDe: 'Task', fileDinhKem: {} },
      ]) await expect('POST', path, owner.token, payload, 400);
      const task = await expect('POST', path, owner.token, { tieuDe: 'Viết báo cáo', nguoiNhanId: member.id, mucDoUuTien: 'CAO', hanHoanThanh: '2026-12-01T10:00:00+07:00' }, 201);
      taskId = task.id;
      assert.equal(task.nguoiGiaoId, owner.id);
      assert.equal(task.nguoiNhanId, member.id);
      assert.equal(task.trangThai, 'CHUA_LAM');
      await expect('GET', path, outsider.token, undefined, 403);
      assert.equal((await expect('GET', path, viewer.token, undefined, 200)).length, 1);
      await expect('PATCH', `${path}/${taskId}/status`, viewer.token, { trangThai: 'HOAN_THANH' }, 403);
      await expect('PATCH', `${path}/${taskId}/status`, member.token, { trangThai: 'BAD' }, 400);
      await expect('PATCH', `${path}/${taskId}/status`, member.token, { trangThai: 'DANG_LAM' }, 204);
      assert.equal((await CongViecNhom.findByPk(taskId)).trang_thai, 'DANG_LAM');
      await expect('PUT', `${path}/${taskId}`, member.token, { tieuDe: 'Hack' }, 403);
      await expect('PUT', `${path}/${taskId}`, owner.token, { tieuDe: 'Báo cáo tuần' }, 204);
      await expect('PUT', `${path}/${taskId}`, owner.token, { nguoiNhanId: outsider.id }, 400);
      await expect('DELETE', `${path}/${taskId}`, member.token, undefined, 403);
      await expect('PATCH', `/api/teams/${otherTeamId}/tasks/${taskId}/status`, outsider.token, { trangThai: 'HOAN_THANH' }, 404);
      await expect('DELETE', `/api/teams/${otherTeamId}/tasks/${taskId}`, outsider.token, undefined, 404);
    });
    await t.test('leader protection and atomic leadership transfer', async () => {
      const path = `/api/teams/${teamId}`;
      await expect('DELETE', `${path}/leave`, owner.token, undefined, 400);
      await expect('DELETE', `${path}/members/${owner.id}`, owner.token, undefined, 400);
      await expect('POST', `${path}/transfer-leader`, member.token, { newLeaderId: member.id }, 403);
      await expect('POST', `${path}/transfer-leader`, owner.token, { newLeaderId: outsider.id }, 400);
      await expect('POST', `${path}/transfer-leader`, owner.token, { newLeaderId: owner.id }, 400);
      await expect('POST', `${path}/transfer-leader`, owner.token, { newLeaderId: member.id }, 200);
      assert.equal((await Nhom.findByPk(teamId)).truong_nhom_id, member.id);
      assert.equal(await ThanhVienNhom.count({ where: { nhom_id: teamId, vai_tro: 'TRUONG_NHOM' } }), 1);
      await expect('PUT', path, owner.token, { tenNhom: 'Old owner' }, 403);
      await expect('PUT', path, member.token, { tenNhom: 'New owner' }, 204);
    });
    await t.test('remove/leave unassign tasks and revoke access', async () => {
      const path = `/api/teams/${teamId}`;
      await expect('PUT', `${path}/tasks/${taskId}`, member.token, { nguoiNhanId: viewer.id }, 204);
      await expect('DELETE', `${path}/members/${viewer.id}`, owner.token, undefined, 403);
      await expect('DELETE', `${path}/members/${viewer.id}`, member.token, undefined, 204);
      assert.equal((await CongViecNhom.findByPk(taskId)).nguoi_nhan_id, null);
      await expect('GET', path, viewer.token, undefined, 403);
      await expect('PATCH', `${path}/tasks/${taskId}/status`, viewer.token, { trangThai: 'HOAN_THANH' }, 403);
      await expect('PUT', `${path}/tasks/${taskId}`, member.token, { nguoiNhanId: owner.id }, 204);
      await expect('DELETE', `${path}/leave`, owner.token, undefined, 204);
      assert.equal((await CongViecNhom.findByPk(taskId)).nguoi_nhan_id, null);
      assert.deepEqual(await expect('GET', '/api/teams', owner.token, undefined, 200), []);
      await expect('GET', path, owner.token, undefined, 403);
    });
    await t.test('migration is repeatable and preserves data', async () => {
      await migrateGroups();
      assert.equal((await Nhom.findByPk(teamId)).ten_nhom, 'New owner');
      assert.ok(await CongViecNhom.findByPk(taskId));
    });
    await t.test('failed multi-write operations roll back', async () => {
      const before = await Nhom.count();
      ThanhVienNhom.addHook('beforeCreate', 'test-failure', () => { throw new Error('Injected membership failure'); });
      try { await expect('POST', '/api/teams', owner.token, { tenNhom: 'Must roll back' }, 500); }
      finally { ThanhVienNhom.removeHook('beforeCreate', 'test-failure'); }
      assert.equal(await Nhom.count(), before);
      await expect('POST', `/api/teams/${teamId}/invite`, member.token, { inviteEmail: owner.email }, 201);
      Nhom.addHook('beforeUpdate', 'test-transfer-failure', () => { throw new Error('Injected transfer failure'); });
      try { await expect('POST', `/api/teams/${teamId}/transfer-leader`, member.token, { newLeaderId: owner.id }, 500); }
      finally { Nhom.removeHook('beforeUpdate', 'test-transfer-failure'); }
      assert.equal((await Nhom.findByPk(teamId)).truong_nhom_id, member.id);
      const leaders = await ThanhVienNhom.findAll({ where: { nhom_id: teamId, vai_tro: 'TRUONG_NHOM' } });
      assert.deepEqual(leaders.map(m => m.nguoi_dung_id), [member.id]);
    });
    await t.test('task/group deletion cleans child rows', async () => {
      await expect('DELETE', `/api/teams/${teamId}/tasks/${taskId}`, member.token, undefined, 204);
      assert.equal(await CongViecNhom.findByPk(taskId), null);
      await expect('POST', `/api/teams/${teamId}/tasks`, member.token, { tieuDe: 'Cascade test' }, 201);
      await expect('DELETE', `/api/teams/${teamId}`, member.token, undefined, 204);
      assert.equal(await CongViecNhom.count({ where: { nhom_id: teamId } }), 0);
      assert.equal(await ThanhVienNhom.count({ where: { nhom_id: teamId } }), 0);
      assert.equal(await Nhom.findByPk(teamId), null);
      assert.ok(await Nhom.findByPk(otherTeamId));
    });
    await t.test('expired/revoked/disabled sessions are rejected', async () => {
      await PhienDangNhap.update({ het_han: new Date(Date.now() - 1000) }, { where: { nguoi_dung_id: owner.id } });
      await expect('GET', '/api/teams', owner.token, undefined, 401);
      await NguoiDung.update({ trang_thai: false }, { where: { id: viewer.id } });
      await expect('GET', '/api/teams', viewer.token, undefined, 401);
      await expect('POST', '/api/auth/logout', member.token, undefined, 204);
      await expect('GET', '/api/teams', member.token, undefined, 401);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (models) await models.sequelize.close();
    if (created) await admin.query(`DROP DATABASE \`${database}\``);
    await admin.end();
  }
});
