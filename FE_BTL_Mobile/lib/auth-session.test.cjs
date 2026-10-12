const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');

const SESSION_KEY = 'auth-session-v1';
const account = { id: 3, username: 'admin-test', email: 'admin@example.test', accessToken: 'old-test-token' };
const providerSource = fs.readFileSync(require.resolve('../components/auth-session.jsx'), 'utf8');
const providerCode = babel.transformSync(providerSource, {
  babelrc: false, configFile: false,
  plugins: [
    [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
    require('@babel/plugin-transform-modules-commonjs'),
  ],
}).code;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

// Render the actual provider with deterministic hooks; storage/native imports
// are test doubles, but session transitions and persistence run production code.
function providerHarness(saved = null) {
  const values = new Map(saved ? [[SESSION_KEY, JSON.stringify(saved)]] : []);
  const calls = [], alerts = [], reminderErrors = [];
  const hooks = [], effects = [];
  let cursor = 0, dirty = false, contextValue, apiToken = null;
  let writeGate = null, removalGate = null, cleanup = Promise.resolve();
  let cleanupCalls = 0;
  const storage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => {
      calls.push({ type: 'set', key, value });
      if (writeGate) await writeGate.promise;
      values.set(key, value);
    },
    removeItem: async key => {
      calls.push({ type: 'remove', key });
      if (removalGate) await removalGate.promise;
      values.delete(key);
    },
  };
  const react = {
    createContext: () => ({ Provider: 'SessionProvider' }),
    useContext: () => contextValue,
    useState: initial => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: initial };
      return [hooks[index].value, next => {
        hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next;
        dirty = true;
      }];
    },
    useEffect: (effect, deps) => {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
        hooks[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => {
          hooks[index].cleanup?.();
          hooks[index].cleanup = effect();
        });
      }
    },
    useMemo: factory => { cursor++; return factory(); },
  };
  const jsx = (type, props) => {
    if (type === 'SessionProvider') contextValue = props.value;
    return { type, props };
  };
  const imports = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@react-native-async-storage/async-storage': storage,
    'react-native': { View: 'View', ActivityIndicator: 'Spinner', Alert: { alert: (...args) => alerts.push(args) } },
    '@/lib/api': { setApiToken: token => { apiToken = token; } },
    '@/lib/task-reminders': {
      stopReminders: () => { cleanupCalls++; return cleanup; },
      reportReminderError: error => reminderErrors.push(error),
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(providerCode, {
    exports: module.exports,
    require: id => {
      assert.ok(Object.hasOwn(imports, id), `Unexpected production import: ${id}`);
      return imports[id];
    },
  });
  function render() {
    cursor = 0; dirty = false;
    module.exports.AuthSessionProvider({ children: null });
    while (effects.length) effects.shift()();
  }
  return {
    values, calls, alerts, reminderErrors, render,
    get value() { return contextValue; },
    get apiToken() { return apiToken; },
    get cleanupCalls() { return cleanupCalls; },
    set writeGate(value) { writeGate = value; },
    set removalGate(value) { removalGate = value; },
    set cleanup(value) { cleanup = value; },
    async settle() {
      for (let i = 0; i < 3; i++) {
        await nextTurn();
        if (dirty) render();
      }
    },
    async boot() { render(); await this.settle(); calls.length = 0; },
  };
}

function savedAccount() {
  const { accessToken, ...user } = account;
  return { user, token: accessToken };
}

test('logout clears auth immediately and returns persistence without waiting for native cleanup', async () => {
  const h = providerHarness(savedAccount());
  await h.boot();
  h.cleanup = deferred().promise;
  const removal = deferred();
  h.removalGate = removal;
  const result = h.value.signOut();
  assert.equal(typeof result?.then, 'function');
  assert.equal(h.apiToken, null);
  assert.equal(h.cleanupCalls, 1);
  h.render();
  assert.equal(h.value.user, null);
  assert.equal(h.value.token, null);
  let persisted = false;
  result.then(() => { persisted = true; });
  await nextTurn();
  assert.equal(persisted, false, 'logout must wait for persisted session removal');
  assert.equal(h.calls[0].type, 'remove');
  removal.resolve();
  await result;
  await h.settle();
  assert.equal(h.values.has(SESSION_KEY), false);
});

test('logout removal is queued after an older pending session write and stays removed on restore', async () => {
  const h = providerHarness();
  await h.boot();
  const oldWrite = deferred();
  h.writeGate = oldWrite;
  h.value.signIn(account);
  h.render();
  await nextTurn();
  assert.equal(h.calls[0].type, 'set');
  const result = h.value.signOut();
  h.render();
  await nextTurn();
  assert.equal(h.calls.filter(call => call.type === 'remove').length, 0, 'do not race the old write');
  oldWrite.resolve();
  await result;
  await h.settle();
  assert.equal(h.calls[1].type, 'remove');
  assert.equal(h.values.has(SESSION_KEY), false);
  const reloaded = providerHarness(h.values.has(SESSION_KEY) ? JSON.parse(h.values.get(SESSION_KEY)) : null);
  await reloaded.boot();
  assert.equal(reloaded.value.user, null);
  assert.equal(reloaded.apiToken, null);
});

test('failed logout storage rejects its result while local auth still clears', async () => {
  const h = providerHarness(savedAccount());
  await h.boot();
  const removal = deferred();
  h.removalGate = removal;
  const result = h.value.signOut();
  assert.equal(typeof result?.then, 'function');
  const rejected = assert.rejects(result, /storage unavailable/);
  removal.reject(new Error('storage unavailable'));
  await rejected;
  assert.equal(h.apiToken, null);
  h.render();
  assert.equal(h.value.user, null);
  await h.settle();
});

test('a native cleanup failure is reported without rejecting successfully persisted logout', async () => {
  const h = providerHarness(savedAccount());
  await h.boot();
  const cleanup = deferred();
  h.cleanup = cleanup.promise;
  const result = h.value.signOut();
  cleanup.reject(new Error('native cleanup failed'));
  await result;
  await h.settle();
  assert.equal(h.values.has(SESSION_KEY), false);
  assert.equal(h.reminderErrors.length, 1);
  assert.equal(h.reminderErrors[0].message, 'native cleanup failed');
});

// Execute the production admin logout function extracted as a Babel AST node,
// rather than matching source text or duplicating its implementation.
function adminLogout(dependencies) {
  const source = fs.readFileSync(require.resolve('../components/admin/admin-accounts.jsx'), 'utf8');
  const ast = babel.parseSync(source, { babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] } });
  const admin = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration;
  const logout = admin.body.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'logout');
  assert.ok(logout, 'AdminAccounts must expose a logout handler');
  const code = babel.transformFromAstSync(babel.types.file(babel.types.program([logout])), null, {
    babelrc: false, configFile: false,
  }).code;
  return vm.runInNewContext(`${code}\nlogout;`, dependencies);
}

for (const outcome of ['resolve', 'reject']) {
  test(`admin local logout never waits for the API, and late ${outcome} cannot clear a newer login`, async () => {
    const remote = deferred();
    let token = 'old-token', localLogouts = 0;
    const cleared = [];
    const logout = adminLogout({
      apiFetch: (url, options) => {
        assert.equal(url, '/api/auth/logout');
        assert.equal(options.method, 'POST');
        assert.equal(token, 'old-token', 'revocation must capture the original token first');
        return remote.promise;
      },
      signOut: () => { localLogouts++; token = null; return Promise.resolve(); },
      setSummary: value => cleared.push(['summary', value]),
      setData: value => cleared.push(['data', JSON.parse(JSON.stringify(value))]),
      setAction: value => cleared.push(['action', value]),
    });
    const result = logout();
    assert.equal(localLogouts, 1);
    assert.equal(token, null);
    assert.deepEqual(cleared, [['summary', null], ['data', { rows: [], total: 0 }], ['action', null]]);
    const finished = await Promise.race([Promise.resolve(result).then(() => true), nextTurn().then(() => false)]);
    assert.equal(finished, true, 'local logout must finish with an offline or stalled backend');
    token = 'new-login-token';
    if (outcome === 'resolve') remote.resolve(null);
    else remote.reject(new Error('offline'));
    await nextTurn();
    assert.equal(token, 'new-login-token');
    assert.equal(localLogouts, 1);
    assert.equal(cleared.length, 3);
  });
}
