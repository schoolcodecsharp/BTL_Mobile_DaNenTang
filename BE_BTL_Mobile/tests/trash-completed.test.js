const assert = require('node:assert/strict');
const test = require('node:test');
const { createHash } = require('node:crypto');
const express = require('express');
const { Op } = require('sequelize');

// Isolated in-memory model doubles: these tests never load the application
// database configuration, create real sessions, or alter user task data.
let rows, updateCalls, transactionCalls, failAfterUpdate;
const ownerToken = 'a'.repeat(64);
const otherToken = 'b'.repeat(64);
const expiredToken = 'c'.repeat(64);
const lockedToken = 'd'.repeat(64);
const digest = token => createHash('sha256').update(token).digest('hex');
const sessions = new Map([
  [digest(ownerToken), { nguoi_dung_id: 1, het_han: new Date(Date.now() + 3600000) }],
  [digest(otherToken), { nguoi_dung_id: 2, het_han: new Date(Date.now() + 3600000) }],
  [digest(expiredToken), { nguoi_dung_id: 1, het_han: new Date(Date.now() - 1000) }],
  [digest(lockedToken), { nguoi_dung_id: 3, het_han: new Date(Date.now() + 3600000) }],
]);

function matches(row, where) {
  return row.nguoi_dung_id === where.nguoi_dung_id &&
    where.id[Op.in].includes(row.id) && row.trang_thai === where.trang_thai &&
    row.ngay_xoa === where.ngay_xoa;
}

const fakeModels = {
  DanhMuc: {},
  PhienDangNhap: { findByPk: async hash => sessions.get(hash) || null },
  NguoiDung: { findByPk: async id => ({ id, trang_thai: id !== 3, vai_tro: 'USER' }) },
  CongViec: {
    async findAll(options) {
      assert.deepEqual(options.attributes, ['id']);
      assert.equal(options.lock, 'UPDATE');
      assert.ok(options.transaction);
      assert.equal(options.where.trang_thai, 'HOAN_THANH');
      assert.equal(options.where.ngay_xoa, null);
      return rows.filter(row => matches(row, options.where)).map(row => ({ id: row.id }));
    },
    async update(values, options) {
      assert.ok(options.transaction);
      assert.deepEqual(Object.keys(values).sort(), ['ngay_cap_nhat', 'ngay_xoa']);
      assert.equal(values.ngay_xoa, values.ngay_cap_nhat);
      assert.ok(values.ngay_xoa instanceof Date);
      updateCalls++;
      let count = 0;
      rows = rows.map(row => {
        if (!matches(row, options.where)) return row;
        count++;
        return { ...row, ...values };
      });
      if (failAfterUpdate) throw new Error('Simulated transaction failure');
      return [count];
    },
    async destroy() { throw new Error('Bulk cleanup must not permanently delete tasks.'); },
    async create() { throw new Error('Bulk cleanup must not generate recurring tasks.'); },
  },
  sequelize: {
    async transaction(callback) {
      transactionCalls++;
      const snapshot = structuredClone(rows);
      try { return await callback({ LOCK: { UPDATE: 'UPDATE' } }); }
      catch (error) { rows = snapshot; throw error; }
    },
  },
};

const modelsPath = require.resolve('../models');
require.cache[modelsPath] = { id: modelsPath, filename: modelsPath, loaded: true, exports: fakeModels };
const taskRouter = require('../routes/tasks');
let server, base;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users/:userId/tasks', taskRouter);
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON không hợp lệ.' });
    return next(error);
  });
  server = await new Promise(resolve => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { if (server) await new Promise(resolve => server.close(resolve)); });
test.beforeEach(() => {
  rows = [
    { id: 10, nguoi_dung_id: 1, trang_thai: 'HOAN_THANH', ngay_xoa: null, ngay_hoan_thanh: '2026-10-10', lap_lai: 'HANG_TUAN', da_tao_lan_tiep: true, tieu_de: 'Review tuần' },
    { id: 11, nguoi_dung_id: 1, trang_thai: 'DANG_LAM', ngay_xoa: null, lap_lai: 'KHONG' },
    { id: 12, nguoi_dung_id: 2, trang_thai: 'HOAN_THANH', ngay_xoa: null },
    { id: 13, nguoi_dung_id: 1, trang_thai: 'HOAN_THANH', ngay_xoa: '2026-10-11' },
    { id: 14, nguoi_dung_id: 1, trang_thai: 'HOAN_THANH', ngay_xoa: null, lap_lai: 'KHONG' },
    { id: 15, nguoi_dung_id: 1, trang_thai: 'HOAN_THANH', ngay_xoa: null },
    { id: 16, nguoi_dung_id: 1, trang_thai: 'CHUA_LAM', ngay_xoa: null },
    { id: 17, nguoi_dung_id: 1, trang_thai: 'QUA_HAN', ngay_xoa: null },
  ];
  updateCalls = 0;
  transactionCalls = 0;
  failAfterUpdate = false;
});

async function request(userId = 1, taskIds = [10], token = ownerToken, body) {
  const response = await fetch(`${base}/api/users/${userId}/tasks/completed/trash`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body === undefined ? { taskIds } : body),
  });
  return { status: response.status, body: await response.json() };
}

test('completed cleanup requires valid active authentication', async () => {
  for (const token of [null, 'invalid', 'e'.repeat(64), expiredToken, lockedToken]) {
    assert.equal((await request(1, [10], token)).status, 401);
  }
  assert.equal(transactionCalls, 0);
});

test('completed cleanup denies another owner, even with valid token', async () => {
  assert.equal((await request(2)).status, 403);
  assert.equal((await request(1, [10], otherToken)).status, 403);
  assert.equal(transactionCalls, 0);
});

test('completed cleanup rejects invalid user path identifiers', async () => {
  for (const userId of ['0', '-1', '1abc', '1.5', '9007199254740992']) {
    assert.equal((await request(userId)).status, 400, userId);
  }
  assert.equal(transactionCalls, 0);
});

test('completed cleanup validates required bounded positive safe integer IDs', async () => {
  for (const body of [{}, null, { taskIds: [] }, { taskIds: '10' }, { taskIds: [0] }, { taskIds: [-1] },
    { taskIds: [1.5] }, { taskIds: ['10'] }, { taskIds: [null] }, { taskIds: [9007199254740992] },
    { taskIds: Array(501).fill(10) }]) {
    assert.equal((await request(1, undefined, ownerToken, body)).status, 400, JSON.stringify(body));
  }
  assert.equal(transactionCalls, 0);
});

test('completed cleanup deduplicates and only soft deletes confirmed completed owner tasks', async () => {
  const before = structuredClone(rows);
  const response = await request(1, [10, 10, 11, 12, 13, 14, 16, 17, 999]);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { movedCount: 2, taskIds: [10, 14] });
  assert.equal(updateCalls, 1);
  assert.equal(transactionCalls, 1);
  assert.equal(rows.length, before.length);
  for (const row of rows) {
    const original = before.find(item => item.id === row.id);
    if ([10, 14].includes(row.id)) {
      assert.ok(row.ngay_xoa instanceof Date);
      assert.equal(row.ngay_xoa, row.ngay_cap_nhat);
      const { ngay_xoa, ngay_cap_nhat, ...remaining } = row;
      const { ngay_xoa: ignored, ...originalRemaining } = original;
      assert.deepEqual(remaining, originalRemaining, 'completion, recurrence and content remain unchanged');
    } else assert.deepEqual(row, original, 'other owners, statuses, trash and unconfirmed rows remain untouched');
  }
});

test('completed cleanup accepts 500 submitted IDs and deduplicates them', async () => {
  assert.deepEqual((await request(1, Array(500).fill(10))).body, { movedCount: 1, taskIds: [10] });
});

test('completed cleanup repeat request is idempotent and does not reset trash date', async () => {
  assert.equal((await request()).body.movedCount, 1);
  const firstDeletedAt = rows.find(row => row.id === 10).ngay_xoa;
  assert.deepEqual((await request()).body, { movedCount: 0, taskIds: [] });
  assert.equal(rows.find(row => row.id === 10).ngay_xoa, firstDeletedAt);
  assert.equal(updateCalls, 1);
});

test('completed cleanup skips IDs whose status changed since the confirmation snapshot', async () => {
  rows.find(row => row.id === 10).trang_thai = 'DANG_LAM';
  const before = structuredClone(rows);
  assert.deepEqual((await request(1, [10, 12, 999])).body, { movedCount: 0, taskIds: [] });
  assert.deepEqual(rows, before);
  assert.equal(updateCalls, 0);
});

test('completed cleanup rolls back all soft deletion on a transaction failure', async t => {
  t.mock.method(console, 'error', () => {});
  const before = structuredClone(rows);
  failAfterUpdate = true;
  const response = await request(1, [10, 14]);
  assert.equal(response.status, 500);
  assert.deepEqual(rows, before);
});

test('completed cleanup contract documents bearer auth and idempotent trash-only response', () => {
  const operation = require('../swagger').paths['/api/users/{userId}/tasks/completed/trash'].post;
  assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
  assert.equal(operation.requestBody.content['application/json'].schema.properties.taskIds.maxItems, 500);
  for (const status of [200, 400, 401, 403, 500]) assert.ok(operation.responses[status]);
});
