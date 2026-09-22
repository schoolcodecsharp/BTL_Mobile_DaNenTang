// Creates and removes only a uniquely named disposable database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { Sequelize } = require('sequelize');
const config = require('../config/database').development;
const name = 'todo_migration_check_' + randomBytes(8).toString('hex');
const admin = new Sequelize({ ...config, database: undefined });
const db = new Sequelize({ ...config, database: name });
let created = false;

function migrate() {
  const result = spawnSync(process.execPath,
    [require.resolve('sequelize-cli/lib/sequelize'), 'db:migrate'],
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'development', DB_NAME: name } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

async function main() {
  try {
    await admin.query('CREATE DATABASE ' + admin.getQueryInterface().quoteIdentifier(name));
    created = true;
    migrate();
    const qi = db.getQueryInterface();
    assert.equal((await qi.showAllTables()).length, 10);
    assert.ok((await qi.describeTable('cong_viec')).file_dinh_kem);
    const [before] = await db.query('SELECT name FROM SequelizeMeta ORDER BY name');
    assert.equal(before.length, 3);
    migrate();
    const [after] = await db.query('SELECT name FROM SequelizeMeta ORDER BY name');
    assert.deepEqual(after, before);
    // Adopt populated legacy schema, where attachment column was not yet added.
    await db.query("INSERT INTO nguoi_dung (ten_dang_nhap,email,mat_khau) VALUES ('migration_check','check@example.test','test-only')");
    await qi.removeColumn('cong_viec', 'file_dinh_kem');
    await db.query('DELETE FROM SequelizeMeta');
    migrate();
    const [rows] = await db.query('SELECT ten_dang_nhap FROM nguoi_dung');
    assert.equal(rows[0].ten_dang_nhap, 'migration_check');
    assert.ok((await qi.describeTable('cong_viec')).file_dinh_kem);
    console.log('PASS: fresh database, repeat run, legacy adoption and data preservation.');
  } finally {
    await db.close();
    if (created && /^todo_migration_check_[a-f0-9]{16}$/.test(name)) {
      await admin.query('DROP DATABASE ' + admin.getQueryInterface().quoteIdentifier(name));
    }
    await admin.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
