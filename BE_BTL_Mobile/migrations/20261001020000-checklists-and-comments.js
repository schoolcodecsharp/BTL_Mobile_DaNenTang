'use strict';
module.exports = {
  async up(qi, S) {
    const definitions = {
      buoc_cong_viec: {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        cong_viec_id: { type: S.INTEGER, allowNull: false, references: { model: 'cong_viec', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        noi_dung: { type: S.STRING(200), allowNull: false },
        hoan_thanh: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      },
      binh_luan_nhom: {
        id: { type: S.INTEGER, primaryKey: true, autoIncrement: true },
        cong_viec_nhom_id: { type: S.INTEGER, allowNull: false, references: { model: 'cong_viec_nhom', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        nguoi_dung_id: { type: S.INTEGER, allowNull: false, references: { model: 'nguoi_dung', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
        noi_dung: { type: S.TEXT, allowNull: false },
        ngay_tao: { type: S.DATE, allowNull: false },
      },
    };
    // MySQL DDL can commit one table before the next fails; accept a retry.
    const tables = await qi.showAllTables();
    for (const [name, columns] of Object.entries(definitions)) {
      if (!tables.includes(name)) await qi.createTable(name, columns);
      else {
        const existing = await qi.describeTable(name);
        for (const column of Object.keys(columns)) {
          if (!existing[column]) throw new Error(`${name} missing ${column}; explicit repair migration required.`);
        }
      }
    }
  },
  async down() {
    throw new Error('Rollback refused: dropping checklists and comments would destroy user data. Use an explicit archival migration.');
  },
};
