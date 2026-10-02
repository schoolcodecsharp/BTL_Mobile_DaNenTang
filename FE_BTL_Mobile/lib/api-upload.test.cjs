const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  let request;
  class NativeFormData {
    parts = [];
    append(...part) { this.parts.push(part); }
  }
  class UploadRequest {
    headers = {};
    constructor() { request = this; }
    open(method, url) { Object.assign(this, { method, url }); }
    setRequestHeader(name, value) { this.headers[name] = value; }
    send(body) { this.body = body; }
    respond(status, data) {
      this.status = status;
      this.responseText = JSON.stringify(data);
      this.onload();
    }
  }
  const context = vm.createContext({
    process: { env: { EXPO_PUBLIC_API_URL: 'http://192.168.1.9:5257/' } },
    FormData: NativeFormData, XMLHttpRequest: UploadRequest,
    fetch: () => assert.fail('URI uploads must bypass Expo fetch'),
  });
  const source = fs.readFileSync(require.resolve('./api.js'), 'utf8').replace(/^export /gm, '');
  vm.runInContext(`${source}\nthis.api = { apiUpload, setApiToken };`, context);
  return { api: context.api, request: () => request };
}

const image = { uri: 'file:///cache/avatar.jpg', name: 'avatar.jpg', type: 'image/jpeg' };

test('native avatar upload sends the local file and token through multipart XHR', async () => {
  const { api, request } = setup();
  api.setApiToken('test-token');
  const pending = api.apiUpload([image]);
  const xhr = request();
  assert.equal(xhr.url, 'http://192.168.1.9:5257/api/upload');
  assert.equal(xhr.method, 'POST');
  assert.equal(xhr.headers.Authorization, 'Bearer test-token');
  assert.equal(xhr.headers['Content-Type'], undefined);
  assert.equal(xhr.timeout, 30000);
  assert.equal(xhr.body.parts[0][0], 'file');
  assert.equal(xhr.body.parts[0][1].uri, image.uri);
  const result = { files: [{ url: 'http://192.168.1.9:5257/uploads/avatar.jpg' }] };
  xhr.respond(201, result);
  assert.equal((await pending).files[0].url, result.files[0].url);
});

test('browser uploads retain the picker File instead of a URI object', async () => {
  const { api, request } = setup();
  const file = new Blob(['image'], { type: 'image/jpeg' });
  const pending = api.apiUpload([{ ...image, file }]);
  assert.equal(request().body.parts[0][1], file);
  assert.equal(request().body.parts[0][2], 'avatar.jpg');
  request().respond(201, { files: [] });
  await pending;
});

test('upload preserves backend errors and reports transport failures', async () => {
  for (const event of ['onerror', 'ontimeout', 'onabort', 'response']) {
    const { api, request } = setup();
    const pending = api.apiUpload([image]);
    if (event === 'response') request().respond(400, { message: 'File quá lớn.' });
    else request()[event]();
    const expected = {
      onerror: /Kiểm tra mạng/, ontimeout: /quá lâu/, onabort: /hủy/, response: /File quá lớn/,
    };
    await assert.rejects(pending, expected[event]);
  }
});
