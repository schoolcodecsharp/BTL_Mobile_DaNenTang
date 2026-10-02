'use strict';

module.exports = {
  async up(qi, S) {
    const taskColumns = await qi.describeTable('cong_viec');
    if (!taskColumns.ngay_xoa) await qi.addColumn('cong_viec', 'ngay_xoa', { type: S.DATE, allowNull: true });

    let notificationColumns = await qi.describeTable('thong_bao');
    if (!notificationColumns.nhom_id) {
      await qi.addColumn('thong_bao', 'nhom_id', { type: S.INTEGER, allowNull: true,
        references: { model: 'nhom', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
    notificationColumns = await qi.describeTable('thong_bao');
    if (!notificationColumns.cong_viec_nhom_id) {
      await qi.addColumn('thong_bao', 'cong_viec_nhom_id', { type: S.INTEGER, allowNull: true,
        references: { model: 'cong_viec_nhom', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
    notificationColumns = await qi.describeTable('thong_bao');
    if (!notificationColumns.loai) await qi.addColumn('thong_bao', 'loai', { type: S.STRING(30), allowNull: false, defaultValue: 'HE_THONG' });

    const tables = await qi.showAllTables();
    if (!tables.includes('nhat_ky_nhom')) {
      await qi.createTable('nhat_ky_nhom', {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        nhom_id: { type: S.INTEGER, allowNull: false, references: { model: 'nhom', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        nguoi_dung_id: { type: S.INTEGER, allowNull: false, references: { model: 'nguoi_dung', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        cong_viec_nhom_id: { type: S.INTEGER, allowNull: true, references: { model: 'cong_viec_nhom', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
        hanh_dong: { type: S.STRING(40), allowNull: false },
        noi_dung: { type: S.TEXT, allowNull: false },
        ngay_tao: { type: S.DATE, allowNull: false },
      });
    } else {
      const existing = await qi.describeTable('nhat_ky_nhom');
      for (const name of ['id', 'nhom_id', 'nguoi_dung_id', 'cong_viec_nhom_id', 'hanh_dong', 'noi_dung', 'ngay_tao']) {
        if (!existing[name]) throw new Error(`nhat_ky_nhom missing ${name}; explicit repair migration required.`);
      }
    }
  },
  async down() {
    throw new Error('Rollback refused: removing trash, notification targets or group activity would destroy user data.');
  },
};
