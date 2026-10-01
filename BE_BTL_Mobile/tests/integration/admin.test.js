require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const mysql = require('mysql2/promise');

test('Admin accounts: real database, authorization and mutations', { timeout: 120000 }, async () => {
  const database = 'todo_admin_test_' + randomBytes(8).toString('hex');
  assert.match(database, /^todo_admin_test_[a-f0-9]{16}$/);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || 'your_password',
  });
  let models, server, created = false;
  try {
    await connection.query('CREATE DATABASE ' + connection.escapeId(database));
    created = true;
    process.env.DB_NAME = database;
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../scripts/run-migrations.js'), 'db:migrate'],
        { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', env: { ...process.env, NODE_ENV: 'development' } });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }
    models = require('../../models');
    const app = require('../../server');
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = 'http://127.0.0.1:' + server.address().port;
    async function request(method, endpoint, token, body, expected = 200) {
      const response = await fetch(base + endpoint, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const raw = await response.text();
      assert.equal(response.status, expected, method + ' ' + endpoint + ': ' + raw);
      return raw ? JSON.parse(raw) : null;
    }
    const password = randomBytes(16).toString('hex');
    const admin = await request('POST', '/api/auth/register', null, { username: 'admin_test', email: 'admin@example.test', password, fullName: 'Admin test', vai_tro: 'ADMIN', role: 'ADMIN' });
    const user = await request('POST', '/api/auth/register', null, { username: 'member_test', email: 'member@example.test', password, fullName: 'Người dùng thử' });
    assert.equal((await models.NguoiDung.findByPk(admin.id)).vai_tro, 'USER', 'registration cannot grant admin');
    const adminToken = (await request('POST', '/api/auth/login', null, { usernameOrEmail: 'admin_test', password })).accessToken;
    const userToken = (await request('POST', '/api/auth/login', null, { usernameOrEmail: 'member_test', password })).accessToken;
    for (const endpoint of ['/api/admin/summary', '/api/admin/users']) {
      await request('GET', endpoint, null, null, 401);
      await request('GET', endpoint, userToken, null, 403);
      await request('GET', endpoint, 'a'.repeat(64), null, 401);
    }
    await models.NguoiDung.update({ vai_tro: 'ADMIN' }, { where: { id: admin.id } });
    const summary = await request('GET', '/api/admin/summary', adminToken);
    assert.deepEqual([summary.total, summary.active, summary.locked], [2, 2, 0]);
    const list = await request('GET', '/api/admin/users', adminToken);
    assert.equal(list.rows.length, 2);
    assert.equal(JSON.stringify(list).includes('mat_khau'), false);
    assert.equal((await request('GET', '/api/admin/users?search=member&role=USER', adminToken)).total, 1);
    assert.equal((await request('GET', '/api/admin/users?search=%25', adminToken)).total, 0, 'literal wildcard');
    assert.equal((await request('GET', '/api/admin/users?page=2', adminToken)).rows.length, 0);
    await request('PATCH', '/api/admin/users/1abc', adminToken, { fullName: 'Invalid', email: 'invalid@example.test' }, 400);
    await request('PATCH', '/api/admin/users/' + user.id, userToken, { fullName: 'Hack', email: 'hack@example.test' }, 403);
    await request('PATCH', '/api/admin/users/' + user.id, adminToken, { fullName: '', email: 'bad' }, 400);
    await request('PATCH', '/api/admin/users/' + user.id, adminToken, { fullName: 'Trùng email', email: 'admin@example.test' }, 409);
    await request('PATCH', '/api/admin/users/' + user.id, adminToken, { fullName: 'Đã cập nhật', email: 'updated@example.test', vai_tro: 'ADMIN' });
    assert.equal((await models.NguoiDung.findByPk(user.id)).vai_tro, 'USER');
    await request('PATCH', '/api/admin/users/' + user.id + '/status', userToken, { active: false }, 403);
    await request('PATCH', '/api/admin/users/' + admin.id + '/status', adminToken, { active: false }, 403);
    await request('PATCH', '/api/admin/users/' + user.id + '/status', adminToken, { active: 'false' }, 400);
    await request('PATCH', '/api/admin/users/' + user.id + '/status', adminToken, { active: false });
    await request('GET', '/api/admin/users', userToken, null, 401);
    await request('POST', '/api/auth/login', null, { usernameOrEmail: 'member_test', password }, 401);
    assert.equal((await request('GET', '/api/admin/users?status=locked', adminToken)).total, 1);
    await request('PATCH', '/api/admin/users/' + user.id + '/status', adminToken, { active: true });
    await models.NguoiDung.update({ vai_tro: 'USER' }, { where: { id: admin.id } });
    await request('GET', '/api/admin/users', adminToken, null, 403);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (models) await models.sequelize.close();
    if (created) await connection.query('DROP DATABASE ' + connection.escapeId(database));
    await connection.end();
  }
});
