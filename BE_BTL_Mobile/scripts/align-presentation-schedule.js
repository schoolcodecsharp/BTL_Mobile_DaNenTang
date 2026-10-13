// Data-only rescheduling. Keep accounts, IDs, assignments and unrelated tasks.
require('../config/database');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const m = require('../models');
const { adjustPersonal, adjustGroup, PERSONAL_SCHEDULE, GROUP_SCHEDULE, reportTime } = require('./presentation-schedule');
async function main() {
  const now = new Date();
  const result = await m.sequelize.transaction(async transaction => {
    const names = ['CongViec', 'CongViecNhom', 'LichSuCongViec', 'NhatKyNhom', 'BinhLuanNhom', 'ThongBao'];
    const before = {};
    for (const name of names) before[name] = await m[name].findAll({ raw: true, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const backupDir = path.resolve(__dirname, '../.local-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `before-report-schedule-${now.toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify(before, null, 2), { flag: 'wx' });
    const personalUpdates = [];
    const groupUpdates = [];
    for (const row of before.CongViec) {
      if (!PERSONAL_SCHEDULE[row.tieu_de]) continue;
      const adjusted = adjustPersonal({ title: row.tieu_de });
      assert(adjusted.start < adjusted.due && adjusted.due <= reportTime);
      assert(!adjusted.completed || adjusted.completed <= adjusted.due && adjusted.completed < now);
      const values = { trang_thai: adjusted.status, ngay_bat_dau: adjusted.start,
        han_hoan_thanh: adjusted.due, ngay_hoan_thanh: adjusted.completed, ngay_cap_nhat: now };
      await m.CongViec.update(values, { where: { id: row.id }, transaction });
      if (adjusted.completed) {
        const histories = before.LichSuCongViec.filter(item => item.cong_viec_id === row.id && item.trang_thai_moi === 'HOAN_THANH');
        if (histories.length) await m.LichSuCongViec.update({ thoi_gian_thay_doi: adjusted.completed }, { where: { cong_viec_id: row.id, trang_thai_moi: 'HOAN_THANH' }, transaction });
        else await m.LichSuCongViec.create({ cong_viec_id: row.id, trang_thai_cu: row.trang_thai,
          trang_thai_moi: 'HOAN_THANH', thoi_gian_thay_doi: adjusted.completed }, { transaction });
      }
      personalUpdates.push({ id: row.id, title: row.tieu_de, ...values });
    }
    for (const row of before.CongViecNhom) {
      if (!GROUP_SCHEDULE[row.tieu_de]) continue;
      const adjusted = adjustGroup({ title: row.tieu_de });
      assert(adjusted.due <= reportTime);
      const values = { trang_thai: adjusted.status, han_hoan_thanh: adjusted.due, ngay_cap_nhat: now };
      await m.CongViecNhom.update(values, { where: { id: row.id }, transaction });
      if (adjusted.status === 'HOAN_THANH' && row.trang_thai !== 'HOAN_THANH') {
        await m.NhatKyNhom.create({ nhom_id: row.nhom_id, nguoi_dung_id: row.nguoi_nhan_id || row.nguoi_giao_id,
          cong_viec_nhom_id: row.id, hanh_dong: 'HOAN_THANH', noi_dung: `Đã hoàn thành ${row.tieu_de}.`,
          ngay_tao: new Date(adjusted.due.getTime() - 15 * 60000) }, { transaction });
        await m.ThongBao.update({ da_doc: true }, { where: { cong_viec_nhom_id: row.id, loai: 'GIAO_VIEC_NHOM' }, transaction });
        for (const comment of before.BinhLuanNhom.filter(item => item.cong_viec_nhom_id === row.id && item.noi_dung.startsWith('Dữ liệu mẫu: mình đã làm phần chính'))) {
          await m.BinhLuanNhom.update({ noi_dung: 'Đã kiểm tra xong phần này.', ngay_tao: new Date(adjusted.due.getTime() - 20 * 60000) }, { where: { id: comment.id }, transaction });
        }
      }
      groupUpdates.push({ id: row.id, title: row.tieu_de, ...values });
    }
    for (const [name, updates] of [['CongViec', personalUpdates], ['CongViecNhom', groupUpdates]]) {
      const after = await m[name].findAll({ raw: true, order: [['id', 'ASC']], transaction });
      assert.equal(after.length, before[name].length);
      for (let index = 0; index < after.length; index++) {
        const update = updates.find(item => item.id === after[index].id);
        if (!update) assert.deepEqual(after[index], before[name][index]);
        else {
          const allowed = name === 'CongViec' ? ['trang_thai', 'ngay_bat_dau', 'han_hoan_thanh', 'ngay_hoan_thanh', 'ngay_cap_nhat']
            : ['trang_thai', 'han_hoan_thanh', 'ngay_cap_nhat'];
          for (const key of Object.keys(after[index]).filter(key => !allowed.includes(key))) assert.deepEqual(after[index][key], before[name][index][key]);
          assert(new Date(after[index].han_hoan_thanh) <= reportTime);
        }
      }
    }
    return { backup, reportTime, personalUpdates, groupUpdates, otherTaskFieldsUnchanged: true };
  });
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => m.sequelize.close());
