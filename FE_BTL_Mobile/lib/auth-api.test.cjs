const assert = require('node:assert/strict');
const test = require('node:test');

const { login, register } = require('./auth-api');

const user = { id: 7, username: 'duong', email: 'duong@example.com', fullName: 'Dương' };
const credentials = { usernameOrEmail: 'duong', password: ' password ' };
const registration = { username: 'duong', email: 'duong@example.com', password: ' password ', fullName: 'Dương' };
const baseUrl = 'http://localhost:5257';

function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(data) };
}

test('login sends the backend contract and preserves password whitespace', async () => {
  let request;
  const result = await login({ ...credentials, usernameOrEmail: ' duong ' }, {
    baseUrl: ` ${baseUrl}/// `,
    fetchImpl: async (url, options) => {
      request = { url, ...options };
      return response(user);
    },
  });

  assert.deepEqual(result, user);
  assert.equal(request.url, `${baseUrl}/api/auth/login`);
  assert.equal(request.method, 'POST');
  assert.equal(request.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(request.body), credentials);
});

test('registration supplies the required username and trims profile fields', async () => {
  let request;
  const result = await register({ ...registration, username: ' duong ', email: ' duong@example.com ', fullName: ' Dương ' }, {
    baseUrl,
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return response(user);
    },
  });

  assert.deepEqual(result, user);
  assert.equal(request.url, `${baseUrl}/api/auth/register`);
  assert.deepEqual(request.body, registration);
});

test('invalid credentials and registration fields do not send requests', async () => {
  const options = { baseUrl, fetchImpl: async () => assert.fail('Validation should run before network access') };
  await assert.rejects(login({ ...credentials, usernameOrEmail: '  ' }, options), /tên đăng nhập/);
  await assert.rejects(login({ ...credentials, password: '  ' }, options), /mật khẩu/);
  await assert.rejects(register({ ...registration, username: '' }, options), /tên đăng nhập/);
  await assert.rejects(register({ ...registration, username: 'a'.repeat(51) }, options), /50 ký tự/);
  await assert.rejects(register({ ...registration, fullName: 'a'.repeat(101) }, options), /100 ký tự/);
  await assert.rejects(register({ ...registration, email: 'invalid-email' }, options), /email hợp lệ/);
  await assert.rejects(register({ ...registration, password: 'short' }, options), /6 ký tự/);
  await assert.rejects(register({ ...registration, password: '      ' }, options), /khoảng trắng/);
});

test('missing or invalid API configuration fails before a request', async () => {
  const fetchImpl = async () => assert.fail('An invalid API URL must not receive credentials');
  for (const invalidUrl of ['', 'ftp://localhost', 'not-a-url', 'http://user:password@localhost', `${baseUrl}?token=1`]) {
    await assert.rejects(login(credentials, { baseUrl: invalidUrl, fetchImpl }), /EXPO_PUBLIC_API_URL/);
  }
});

test('a rejected login never returns a successful user', async () => {
  await assert.rejects(login(credentials, {
    baseUrl,
    fetchImpl: async () => response({ message: 'Invalid credentials.' }, 401),
  }), /Invalid credentials/);
});

test('duplicate account and ASP.NET field validation messages remain visible', async () => {
  await assert.rejects(register(registration, {
    baseUrl,
    fetchImpl: async () => response({ message: 'Username or email already exists.' }, 400),
  }), /already exists/);
  await assert.rejects(register(registration, {
    baseUrl,
    fetchImpl: async () => response({ errors: { Email: ['Email is invalid.'], Username: ['Username is required.'] } }, 400),
  }), /Email is invalid\.\nUsername is required\./);
});

test('server failures produce a useful error even when the response is HTML', async () => {
  await assert.rejects(login(credentials, {
    baseUrl,
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '<html>Unavailable</html>' }),
  }), /Máy chủ đang gặp sự cố/);
});

test('empty, malformed, or wrong successful payloads cannot count as login success', async () => {
  for (const body of ['', '<html>Wrong server</html>', 'null', '{}', JSON.stringify({ ...user, id: 0 })]) {
    await assert.rejects(login(credentials, {
      baseUrl,
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => body }),
    }), /dữ liệu tài khoản không hợp lệ/);
  }
});

test('network failures produce a connection error', async () => {
  await assert.rejects(login(credentials, {
    baseUrl,
    fetchImpl: async () => { throw new TypeError('Failed to fetch'); },
  }), /Không thể kết nối máy chủ/);
});

test('an unresponsive request is aborted and reports a timeout', async () => {
  let requestSignal;
  await assert.rejects(login(credentials, {
    baseUrl,
    timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      requestSignal = signal;
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    }),
  }), /phản hồi quá lâu/);
  assert.equal(requestSignal.aborted, true);
});
