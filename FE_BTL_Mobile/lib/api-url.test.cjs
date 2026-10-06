const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveApiUrl } = require('./api-url.cjs');

test('web uses its host, independently of the Expo port', () => {
  assert.equal(resolveApiUrl({ development: true, webHostname: 'localhost' }), 'http://localhost:5257');
});
test('native follows the Expo LAN host when the network changes', () => {
  for (const host of ['192.168.1.4', '10.0.0.8']) {
    assert.equal(resolveApiUrl({ development: true, hostUri: `${host}:8081`, configuredUrl: 'auto' }), `http://${host}:5257`);
  }
});
test('explicit deployment URL wins and production never guesses a host', () => {
  assert.equal(resolveApiUrl({ configuredUrl: ' https://api.example.com/ ' }), 'https://api.example.com');
  assert.throws(() => resolveApiUrl({ development: false, webHostname: 'localhost' }), /EXPO_PUBLIC_API_URL/);
  assert.throws(() => resolveApiUrl({ development: true }), /Expo LAN/);
  assert.throws(() => resolveApiUrl({ development: true, hostUri: 'test.exp.direct:80' }), /--lan/);
});
