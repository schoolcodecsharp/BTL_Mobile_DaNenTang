// Update wording only. No deletes, new tasks, deadline or account changes.
require('../config/database');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const m = require('../models');
const { SIMPLE_TASK_TEXT } = require('./simple-presentation-text');

async function main() {
  const apply = process.argv.includes('--apply');
  const result = await m.sequelize.transaction(async transaction => {
    const tables = ['CongViec', 'CongViecNhom', 'ThongBao', 'NhatKyNhom'];
    const before = {};
    for (const name of tables) before[name] = await m[name].findAll({ raw: true, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const updates = [];
    for (const name of ['CongViec', 'CongViecNhom']) {
      for (const row of before[name]) {
        const text = SIMPLE_TASK_TEXT.find(([oldTitle, newTitle]) => row.tieu_de === oldTitle || row.tieu_de === newTitle);
        if (text && (row.tieu_de !== text[1] || row.mo_ta !== text[2])) updates.push({ name, id: row.id,
          values: { tieu_de: text[1], mo_ta: text[2], ngay_cap_nhat: row.ngay_cap_nhat } });
      }
    }
    // Keep notification and activity text consistent with the renamed tasks.
    for (const name of ['ThongBao', 'NhatKyNhom']) {
      for (const row of before[name]) {
        let content = row.noi_dung;
        for (const [oldTitle, newTitle] of SIMPLE_TASK_TEXT) content = content?.split(oldTitle).join(newTitle);
        if (content !== row.noi_dung) updates.push({ name, id: row.id, values: { noi_dung: content } });
      }
    }
    if (!apply || !updates.length) return { mode: apply ? 'unchanged' : 'preview', updates: updates.map(({ name, id, values }) => ({ table: name, id, ...values })) };
    const backupDir = path.resolve(__dirname, '../.local-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `before-simple-text-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify(before, null, 2), { flag: 'wx' });
    for (const { name, id, values } of updates) await m[name].update(values, { where: { id }, transaction });
    for (const name of tables) {
      const after = await m[name].findAll({ raw: true, order: [['id', 'ASC']], transaction });
      assert.equal(after.length, before[name].length);
      for (let index = 0; index < after.length; index++) {
        const update = updates.find(item => item.name === name && item.id === after[index].id);
        assert.deepEqual(after[index], { ...before[name][index], ...(update?.values || {}) });
      }
    }
    return { mode: 'apply', backup, updatedPersonal: updates.filter(item => item.name === 'CongViec').length,
      updatedGroup: updates.filter(item => item.name === 'CongViecNhom').length,
      otherFieldsUnchanged: true, samples: updates.filter(item => ['CongViec', 'CongViecNhom'].includes(item.name)).map(item => item.values) };
  });
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => m.sequelize.close());
