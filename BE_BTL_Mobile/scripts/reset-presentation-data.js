// Data-only reset explicitly requested for presentation. Never alters schema,
// accounts, passwords, roles, login sessions, uploads or migration history.
// Preview: node scripts/reset-presentation-data.js --email abc@gmail.com --scope all
// Apply: append --apply. A local task-data backup is mandatory before deletion.
require('../config/database');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const m = require('../models');
const { makeFixture } = require('./presentation-fixture');
const DELETE_ORDER = ['ThongBao', 'NhatKyNhom', 'BinhLuanNhom', 'NhacNho',
  'LichSuCongViec', 'BuocCongViec', 'CongViecNhom', 'ThanhVienNhom', 'Nhom', 'CongViec', 'DanhMuc'];
const rows = (name, transaction) => m[name].findAll({ raw: true, order: [['id', 'ASC']], transaction });

async function main() {
  const args = process.argv.slice(2);
  const option = name => args[args.indexOf(name) + 1];
  const email = args.includes('--email') ? option('--email') : null;
  if (!email || !email.includes('@') || option('--scope') !== 'all') {
    throw new Error('Requires exact --email and --scope all. Default mode is preview; --apply deletes all old task/group data.');
  }
  const apply = args.includes('--apply');
  const now = new Date();
  const fixture = makeFixture(now);
  const result = await m.sequelize.transaction(async transaction => {
    const accounts = await m.NguoiDung.findAll({ raw: true, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const sessions = await m.PhienDangNhap.findAll({ raw: true, order: [['token_hash', 'ASC']], transaction });
    const demo = accounts.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (!demo) throw new Error('Demo account not found; nothing changed.');
    // Use established teammate accounts; never create or modify accounts.
    const eligible = accounts.filter(user => user.id !== demo.id && user.vai_tro !== 'ADMIN' && user.trang_thai);
    const peer1 = eligible.find(user => user.ten_dang_nhap === 'truong') || eligible[0];
    const peer2 = eligible.find(user => user.ten_dang_nhap === 'duong' && user.id !== peer1?.id)
      || eligible.find(user => user.id !== peer1?.id);
    if (!peer1 || !peer2) throw new Error('Need two other active non-admin accounts for group demo; nothing changed.');
    const roles = { demo, peer1, peer2 };
    const original = {};
    for (const name of DELETE_ORDER) original[name] = await rows(name, transaction);
    const plan = {
      mode: apply ? 'apply' : 'preview', database: m.sequelize.config.database,
      account: { id: demo.id, username: demo.ten_dang_nhap, email: demo.email }, day: fixture.day,
      accountsKept: accounts.length, loginSessionsKept: sessions.length,
      oldCounts: Object.fromEntries(DELETE_ORDER.map(name => [name, original[name].length])),
      newCounts: { personalActive: 17, personalRegular: 14, personalRecurring: 3, trash: 3, categories: 4, groups: 2, groupTasks: 9 },
      teammates: [peer1, peer2].map(user => ({ id: user.id, username: user.ten_dang_nhap })),
      samples: fixture.tasks.map(task => ({ title: task.title, status: task.status, due: task.due, recurrence: task.recurrence, trash: task.trash })),
    };
    if (!apply) return plan;

    const backupDir = path.resolve(__dirname, '../.local-backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backup = path.join(backupDir, `before-presentation-${now.toISOString().replace(/[:.]/g, '-')}.json`);
    const snapshot = { createdAt: now.toISOString(), database: m.sequelize.config.database,
      accountIds: accounts.map(user => user.id), data: original };
    fs.writeFileSync(backup, JSON.stringify(snapshot, null, 2), { flag: 'wx' });
    assert.deepEqual(JSON.parse(fs.readFileSync(backup, 'utf8')).data, JSON.parse(JSON.stringify(original)));
    // DELETE (not TRUNCATE): transactional, preserves IDs and foreign-key checks.
    for (const name of DELETE_ORDER) await m[name].destroy({ where: {}, transaction });

    const categories = new Map();
    for (const [name, description, color] of fixture.categories) {
      const category = await m.DanhMuc.create({ nguoi_dung_id: demo.id, ten_danh_muc: name, mo_ta: description, mau_sac: color }, { transaction });
      categories.set(name, category.id);
    }
    const personal = [];
    for (const task of fixture.tasks) {
      const created = await m.CongViec.create({ nguoi_dung_id: demo.id, danh_muc_id: categories.get(task.category),
        tieu_de: task.title, mo_ta: task.description, muc_do_uu_tien: task.priority, trang_thai: task.status,
        ngay_bat_dau: task.start, han_hoan_thanh: task.due, ngay_hoan_thanh: task.completed,
        ngay_tao: task.created, ngay_cap_nhat: task.deleted || task.completed || (task.start < now ? task.start : task.created),
        lap_lai: task.recurrence, da_tao_lan_tiep: false, ngay_xoa: task.deleted, file_dinh_kem: null,
      }, { transaction });
      personal.push(created);
      if (task.status === 'HOAN_THANH') {
        await m.LichSuCongViec.create({ cong_viec_id: created.id, trang_thai_cu: 'DANG_LAM', trang_thai_moi: 'HOAN_THANH', thoi_gian_thay_doi: task.completed }, { transaction });
      }
    }
    for (const index of [4, 5]) {
      for (const [content, complete] of index === 4
        ? [['Chụp ảnh các màn hình chính', true], ['Viết mô tả luồng sử dụng', true], ['Đối chiếu chú thích trong báo cáo', false]]
        : [['Lập dàn ý trình bày', true], ['Thêm ảnh minh họa', false], ['Tổng duyệt trong 5 phút', false]]) {
        await m.BuocCongViec.create({ cong_viec_id: personal[index].id, noi_dung: content, hoan_thanh: complete }, { transaction });
      }
    }
    for (const group of fixture.groups) {
      const leader = roles[group.leader];
      const team = await m.Nhom.create({ ten_nhom: group.name, mo_ta: group.description,
        truong_nhom_id: leader.id, ngay_tao: fixture.at(-5, 8) }, { transaction });
      for (const member of Object.values(roles)) {
        await m.ThanhVienNhom.create({ nhom_id: team.id, nguoi_dung_id: member.id,
          vai_tro: member.id === leader.id ? 'TRUONG_NHOM' : 'THANH_VIEN', ngay_tham_gia: fixture.at(-5, 9) }, { transaction });
      }
      await m.NhatKyNhom.create({ nhom_id: team.id, nguoi_dung_id: leader.id,
        hanh_dong: 'TAO_NHOM', noi_dung: `Dữ liệu mẫu: thành lập ${group.name} và thống nhất phân công.`, ngay_tao: fixture.at(-5, 9) }, { transaction });
      for (const task of group.tasks) {
        const assignee = roles[task.assignee];
        const taskRow = await m.CongViecNhom.create({ nhom_id: team.id, nguoi_giao_id: leader.id,
          nguoi_nhan_id: assignee.id, tieu_de: task.title, mo_ta: task.description, muc_do_uu_tien: task.priority,
          trang_thai: task.status, han_hoan_thanh: task.due, ngay_tao: fixture.at(-4, 9), ngay_cap_nhat: fixture.at(-1, 17), file_dinh_kem: null }, { transaction });
        await m.NhatKyNhom.create({ nhom_id: team.id, nguoi_dung_id: leader.id, cong_viec_nhom_id: taskRow.id,
          hanh_dong: 'GIAO_VIEC', noi_dung: `Dữ liệu mẫu: giao “${task.title}” cho ${assignee.ten_dang_nhap}.`, ngay_tao: fixture.at(-4, 10) }, { transaction });
        await m.ThongBao.create({ nguoi_dung_id: assignee.id, nhom_id: team.id, cong_viec_nhom_id: taskRow.id,
          tieu_de: 'Bạn được giao công việc nhóm', noi_dung: `${group.name}: ${task.title}`, loai: 'GIAO_VIEC_NHOM',
          da_doc: task.status === 'HOAN_THANH', ngay_tao: fixture.at(-4, 10) }, { transaction });
        if (task.status === 'DANG_LAM') {
          await m.BinhLuanNhom.create({ cong_viec_nhom_id: taskRow.id, nguoi_dung_id: assignee.id,
            noi_dung: 'Dữ liệu mẫu: mình đã làm phần chính, đang rà soát các trường hợp còn lại trước khi hoàn thành.', ngay_tao: fixture.at(-1, 16) }, { transaction });
        }
      }
    }
    // Verify complete account records, including password hashes and roles, in
    // memory only. Neither accounts nor bearer/session digests enter the backup.
    assert.deepEqual(await m.NguoiDung.findAll({ raw: true, order: [['id', 'ASC']], transaction }), accounts);
    assert.deepEqual(await m.PhienDangNhap.findAll({ raw: true, order: [['token_hash', 'ASC']], transaction }), sessions);
    for (const name of DELETE_ORDER) {
      const after = await rows(name, transaction);
      const oldIds = new Set(original[name].map(row => row.id));
      assert(after.every(row => !oldIds.has(row.id)), `Old rows remain in ${name}`);
    }
    assert.equal(await m.CongViec.count({ transaction }), 20);
    assert.equal(await m.CongViec.count({ where: { nguoi_dung_id: demo.id, ngay_xoa: null }, transaction }), 17);
    assert.equal(await m.CongViecNhom.count({ transaction }), 9);
    assert.equal(await m.Nhom.count({ transaction }), 2);
    assert.equal(await m.DanhMuc.count({ transaction }), 4);
    return { ...plan, backup, accountsUnchanged: true, sessionsUnchanged: true,
      verifiedCounts: Object.fromEntries(await Promise.all(DELETE_ORDER.map(async name => [name, await m[name].count({ transaction })]))) };
  });
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => m.sequelize.close());
