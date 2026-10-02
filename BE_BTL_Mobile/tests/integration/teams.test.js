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
    await t.test('checklist ownership plus trash restore and permanent deletion', async () => {
      const task = await expect('POST', `/api/users/${owner.id}/tasks`, owner.token, { title: 'Checklist test' }, 201);
      const path = `/api/users/${owner.id}/tasks/${task.id}/checklist`;
      await expect('GET', path, null, undefined, 401);
      await expect('GET', path, outsider.token, undefined, 403);
      await expect('POST', path, owner.token, { noiDung: ' ' }, 400);
      const item = await expect('POST', path, owner.token, { noiDung: ' Prepare demo ' }, 201);
      assert.equal(item.noiDung, 'Prepare demo');
      await expect('PATCH', `${path}/${item.id}`, owner.token, { hoanThanh: 'true' }, 400);
      await expect('PATCH', `${path}/${item.id}`, owner.token, { hoanThanh: true }, 200);
      assert.equal((await expect('GET', path, owner.token, undefined, 200))[0].hoanThanh, true);
      const other = await expect('POST', `/api/users/${owner.id}/tasks`, owner.token, { title: 'Other' }, 201);
      await expect('DELETE', `/api/users/${owner.id}/tasks/${other.id}/checklist/${item.id}`, owner.token, undefined, 404);
      await expect('DELETE', `${path}/${item.id}`, owner.token, undefined, 204);
      await expect('POST', path, owner.token, { noiDung: 'Cascade step' }, 201);
      await expect('DELETE', `/api/users/${owner.id}/tasks/${task.id}`, owner.token, undefined, 204);
      assert.equal((await expect('GET', `/api/users/${owner.id}/tasks`, owner.token, undefined, 200)).some(t => t.id === task.id), false);
      assert.equal((await expect('GET', `/api/users/${owner.id}/tasks/trash`, owner.token, undefined, 200)).some(t => t.id === task.id), true);
      assert.equal(await models.BuocCongViec.count({ where: { cong_viec_id: task.id } }), 1);
      await expect('POST', `/api/users/${owner.id}/tasks/${task.id}/restore`, owner.token, undefined, 200);
      assert.equal((await expect('GET', `/api/users/${owner.id}/tasks`, owner.token, undefined, 200)).some(t => t.id === task.id), true);
      await expect('DELETE', `/api/users/${owner.id}/tasks/${task.id}`, owner.token, undefined, 204);
      await expect('DELETE', `/api/users/${owner.id}/tasks/${task.id}/permanent`, owner.token, undefined, 204);
      assert.equal(await models.BuocCongViec.count({ where: { cong_viec_id: task.id } }), 0);
    });
    await t.test('comments enforce membership, authorship and task scope', async () => {
      const path = `/api/teams/${teamId}/tasks/${taskId}/comments`;
      await expect('GET', path, outsider.token, undefined, 403);
      await expect('POST', path, owner.token, { noiDung: '' }, 400);
      await expect('POST', path, owner.token, { noiDung: 'a'.repeat(2001) }, 400);
      const comment = await expect('POST', path, owner.token, { noiDung: 'Demo ready' }, 201);
      assert.equal(comment.nguoiDungId, owner.id);
      assert.equal(comment.tacGia.tenDangNhap, 'owner');
      assert.equal((await expect('GET', path, member.token, undefined, 200))[0].noiDung, 'Demo ready');
      const memberNotifications = await expect('GET', `/api/users/${member.id}/notifications`, member.token, undefined, 200);
      const commentNotification = memberNotifications.find(n => n.loai === 'BINH_LUAN_NHOM' && n.congViecNhomId === taskId);
      assert.ok(commentNotification);
      assert.equal(commentNotification.nhomId, teamId);
      await expect('PATCH', `/api/users/${member.id}/notifications/${commentNotification.id}/read`, outsider.token, undefined, 403);
      await expect('PATCH', `/api/users/${member.id}/notifications/${commentNotification.id}/read`, member.token, undefined, 204);
      await expect('POST', `/api/teams/${teamId}/invite`, member.token, { inviteEmail: viewer.email }, 201);
      await expect('DELETE', `${path}/${comment.id}`, viewer.token, undefined, 403);
      await expect('DELETE', `/api/teams/${otherTeamId}/tasks/${taskId}/comments/${comment.id}`, outsider.token, undefined, 404);
      await expect('DELETE', `${path}/${comment.id}`, owner.token, undefined, 204);
      const moderated = await expect('POST', path, owner.token, { noiDung: 'Moderate this' }, 201);
      await expect('DELETE', `${path}/${moderated.id}`, member.token, undefined, 204);
      await expect('POST', path, owner.token, { noiDung: 'Cascade comment' }, 201);
      await migrateGroups();
      assert.equal((await expect('GET', path, owner.token, undefined, 200)).length, 1);
    });
    await t.test('group activity is a member-only chronological timeline', async () => {
      await expect('GET', `/api/teams/${teamId}/activity`, outsider.token, undefined, 403);
      const timeline = await expect('GET', `/api/teams/${teamId}/activity`, member.token, undefined, 200);
      assert.ok(timeline.length >= 4);
      assert.ok(timeline.some(item => item.hanhDong === 'TAO_CONG_VIEC'));
      assert.ok(timeline.some(item => item.hanhDong === 'CAP_NHAT_CONG_VIEC'));
      assert.ok(timeline.some(item => item.hanhDong === 'CAP_NHAT_TRANG_THAI'));
      assert.ok(timeline.some(item => item.hanhDong === 'BINH_LUAN'));
      for (let i = 1; i < timeline.length; i += 1) {
        assert.ok(new Date(timeline[i - 1].ngayTao) >= new Date(timeline[i].ngayTao));
      }
    });
    await t.test('recurring tasks create exactly one next occurrence with a reset checklist', async () => {
      await expect('POST', `/api/users/${owner.id}/tasks`, owner.token,
        { title: 'Missing due date', recurrence: 'HANG_NGAY' }, 400);
      await expect('POST', `/api/users/${owner.id}/tasks`, owner.token,
        { title: 'Bad recurrence', recurrence: 'MOI_GIO', dueDate: '2026-10-01T08:00:00.000Z' }, 400);
      const recurring = await expect('POST', `/api/users/${owner.id}/tasks`, owner.token, {
        title: 'Daily review', recurrence: 'HANG_NGAY', dueDate: '2026-10-01T08:00:00.000Z',
      }, 201);
      const step = await expect('POST', `/api/users/${owner.id}/tasks/${recurring.id}/checklist`, owner.token,
        { noiDung: 'Review notes' }, 201);
      await expect('PATCH', `/api/users/${owner.id}/tasks/${recurring.id}/checklist/${step.id}`, owner.token,
        { hoanThanh: true }, 200);
      const completedPayload = {
        title: recurring.tieuDe, description: recurring.moTa, priority: recurring.mucDoUuTien,
        status: 'HOAN_THANH', dueDate: recurring.hanHoanThanh, recurrence: recurring.lapLai,
      };
      await expect('PUT', `/api/users/${owner.id}/tasks/${recurring.id}`, owner.token, completedPayload, 204);
      let occurrences = (await expect('GET', `/api/users/${owner.id}/tasks`, owner.token, undefined, 200))
        .filter(item => item.tieuDe === 'Daily review');
      assert.equal(occurrences.length, 2);
      const next = occurrences.find(item => item.id !== recurring.id);
      assert.equal(next.lapLai, 'HANG_NGAY');
      assert.equal(new Date(next.hanHoanThanh).toISOString(), '2026-10-02T08:00:00.000Z');
      const nextSteps = await expect('GET', `/api/users/${owner.id}/tasks/${next.id}/checklist`, owner.token, undefined, 200);
      assert.deepEqual(nextSteps.map(item => [item.noiDung, item.hoanThanh]), [['Review notes', false]]);
      await expect('PUT', `/api/users/${owner.id}/tasks/${recurring.id}`, owner.token, completedPayload, 204);
      occurrences = (await expect('GET', `/api/users/${owner.id}/tasks`, owner.token, undefined, 200))
        .filter(item => item.tieuDe === 'Daily review');
      assert.equal(occurrences.length, 2);
    });
    await t.test('task/group deletion cleans child rows', async () => {
      await expect('DELETE', `/api/teams/${teamId}/tasks/${taskId}`, member.token, undefined, 204);
      assert.equal(await CongViecNhom.findByPk(taskId), null);
      assert.equal(await models.BinhLuanNhom.count({ where: { cong_viec_nhom_id: taskId } }), 0);
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
