const { sequelize, Nhom, ThanhVienNhom, CongViecNhom, PhienDangNhap } = require('../models');

// Additive migration: no force/alter, no reset of existing application data.
async function migrateGroups() {
  await Nhom.sync();
  await ThanhVienNhom.sync();
  await CongViecNhom.sync();
  await PhienDangNhap.sync();
  const qi = sequelize.getQueryInterface();
  const indexes = await qi.showIndex('thanh_vien_nhom');
  if (!indexes.some(index => index.unique && index.fields.length === 2 &&
      ['nhom_id', 'nguoi_dung_id'].every(field => index.fields.some(item => item.attribute === field)))) {
    await qi.addIndex('thanh_vien_nhom', ['nhom_id', 'nguoi_dung_id'], { unique: true, name: 'uq_nhom_nd' });
  }
}

module.exports = { migrateGroups };
