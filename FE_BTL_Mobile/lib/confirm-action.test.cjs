const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(platform, browser) {
  const alerts = [];
  const context = vm.createContext({
    Alert: { alert: (...args) => alerts.push(args) },
    Platform: { OS: platform },
    ...(browser ? { window: browser } : {}),
  });
  const source = fs.readFileSync(require.resolve('./confirm-action.js'), 'utf8')
    .replace(/^import .*;\r?\n/m, '')
    .replace(/^export /gm, '');
  vm.runInContext(`${source}\nthis.confirmAction = confirmAction;`, context);
  return { confirmAction: context.confirmAction, alerts };
}

const options = {
  title: 'Đăng xuất', message: 'Bạn có chắc muốn đăng xuất khỏi TaskMaster?',
  confirmText: 'Đăng xuất', destructive: true,
};

test('web confirms logout through the browser and returns the logout result', async () => {
  let message;
  let logouts = 0;
  const { confirmAction, alerts } = setup('web', { confirm: (text) => { message = text; return true; } });
  const result = await confirmAction({ ...options, onConfirm: async () => { logouts++; return 'signed out'; } });
  assert.equal(message, `${options.title}\n\n${options.message}`);
  assert.equal(logouts, 1);
  assert.equal(result, 'signed out');
  assert.equal(alerts.length, 0);
});

test('canceling the web dialog leaves the session alone', () => {
  const { confirmAction, alerts } = setup('web', { confirm: () => false });
  confirmAction({ ...options, onConfirm: () => assert.fail('must preserve the session') });
  assert.equal(alerts.length, 0);
});

test('server rendering does not run logout or access a missing window', () => {
  const { confirmAction, alerts } = setup('web');
  confirmAction({ ...options, onConfirm: () => assert.fail('must not log out without confirmation') });
  assert.equal(alerts.length, 0);
});

for (const platform of ['android', 'ios']) {
  test(`${platform} preserves the native cancel and destructive confirmation buttons`, () => {
    let logouts = 0;
    const { confirmAction, alerts } = setup(platform, { confirm: () => assert.fail('must use native alert') });
    confirmAction({ ...options, onConfirm: () => { logouts++; } });
    assert.equal(logouts, 0);
    assert.equal(alerts.length, 1);
    const [title, message, buttons] = alerts[0];
    assert.equal(title, options.title);
    assert.equal(message, options.message);
    assert.equal(buttons[0].text, 'Hủy');
    assert.equal(buttons[0].style, 'cancel');
    assert.equal(buttons[0].onPress, undefined);
    assert.equal(buttons[1].text, options.confirmText);
    assert.equal(buttons[1].style, 'destructive');
    buttons[1].onPress();
    assert.equal(logouts, 1);
  });
}
