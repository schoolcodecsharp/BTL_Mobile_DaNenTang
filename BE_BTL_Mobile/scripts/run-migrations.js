// Keep historical support files intact; expose only timestamped migrations to CLI.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-migrations-'));
try {
  for (const name of fs.readdirSync(path.join(root, 'migrations'))) {
    if (!/^\d{14}-.+\.js$/.test(name)) continue;
    const source = path.join(root, 'migrations', name);
    fs.writeFileSync(path.join(staging, name), `module.exports = require(${JSON.stringify(source)});\n`);
  }
  const result = spawnSync(process.execPath,
    [require.resolve('sequelize-cli/lib/sequelize'), ...process.argv.slice(2), '--migrations-path', staging],
    { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  // Only files created above inside this uniquely allocated directory are removed.
  for (const name of fs.readdirSync(staging)) fs.unlinkSync(path.join(staging, name));
  fs.rmdirSync(staging);
}
