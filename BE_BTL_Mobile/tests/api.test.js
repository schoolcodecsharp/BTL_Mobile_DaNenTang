const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const http = require('node:http');

// ── Helpers ─────────────────────────────────────────────────
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/users/:userId/tasks', require('../routes/tasks'));
  app.use('/api/users', require('../routes/users'));
  app.use('/api/users/:userId/categories', require('../routes/categories'));
  app.use('/api/users/:userId/notifications', require('../routes/notifications'));
  app.use('/api/tasks/:taskId/reminders', require('../routes/reminders'));
  app.use('/api/tasks/:taskId/history', require('../routes/taskHistory'));
  return app;
}

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* empty or non-JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Route Smoke Tests (no database required) ────────────────
// These tests verify route wiring and input validation only.
// They will get DB errors for actual CRUD, which is expected.

test('auth routes are wired and reject empty credentials', async () => {
  const app = createTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // Login with empty body
    const loginRes = await request(server, 'POST', '/api/auth/login', {});
    assert.equal(loginRes.status, 400);
    assert.ok(loginRes.body.message);

    // Register with empty body
    const regRes = await request(server, 'POST', '/api/auth/register', {});
    assert.equal(regRes.status, 400);
    assert.ok(regRes.body.message);

    // Register with invalid email
    const regRes2 = await request(server, 'POST', '/api/auth/register', {
      username: 'test', email: 'invalid', password: 'secret123',
    });
    assert.equal(regRes2.status, 400);

    // Register with missing password
    const regRes3 = await request(server, 'POST', '/api/auth/register', {
      username: 'test', email: 'test@example.com', password: '   ',
    });
    assert.equal(regRes3.status, 400);

    // Register with username too long
    const regRes4 = await request(server, 'POST', '/api/auth/register', {
      username: 'a'.repeat(51), email: 'test@example.com', password: 'secret123',
    });
    assert.equal(regRes4.status, 400);
  } finally {
    server.close();
  }
});

test('task routes validate required title', async () => {
  const app = createTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    // Blank title
    const res = await request(server, 'POST', '/api/users/1/tasks', { title: '' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors?.Title);

    // Title too long
    const res2 = await request(server, 'POST', '/api/users/1/tasks', { title: 'a'.repeat(201) });
    assert.equal(res2.status, 400);

    // Invalid priority
    const res3 = await request(server, 'POST', '/api/users/1/tasks', { title: 'Test', priority: 'INVALID' });
    assert.equal(res3.status, 400);

    // Invalid status
    const res4 = await request(server, 'POST', '/api/users/1/tasks', { title: 'Test', status: 'INVALID' });
    assert.equal(res4.status, 400);

    // DueDate before StartDate
    const res5 = await request(server, 'POST', '/api/users/1/tasks', {
      title: 'Test',
      startDate: '2025-01-10',
      dueDate: '2025-01-05',
    });
    assert.equal(res5.status, 400);
    assert.ok(res5.body.errors?.DueDate);
  } finally {
    server.close();
  }
});

test('category routes validate required name', async () => {
  const app = createTestApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const res = await request(server, 'POST', '/api/users/1/categories', { name: '' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors?.Name);

    const res2 = await request(server, 'POST', '/api/users/1/categories', { name: 'a'.repeat(101) });
    assert.equal(res2.status, 400);
  } finally {
    server.close();
  }
});

test('server.js exports express app', () => {
  // Just verify the module loads without crashing (DB connection only happens in main)
  const app = require('../server');
  assert.equal(typeof app.listen, 'function');
  assert.equal(typeof app.use, 'function');
});
