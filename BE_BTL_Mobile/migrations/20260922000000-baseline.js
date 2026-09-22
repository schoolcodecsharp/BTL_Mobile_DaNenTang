const { Sequelize } = require('sequelize');
const defineBaseline = require('../migration-support/schema-20260922');

module.exports = {
  async up(queryInterface) {
    // Isolated, frozen definitions; never read the application's evolving models.
    const snapshot = new Sequelize('snapshot', 'unused', '', { dialect: 'mysql', logging: false });
    try {
      const models = defineBaseline(snapshot);
      const tables = await queryInterface.showAllTables();
      // Validate existing tables before making changes. No silent schema alteration.
      for (const model of models) {
        const table = model.getTableName();
        if (!tables.includes(table)) continue;
        const columns = await queryInterface.describeTable(table);
        const missing = Object.keys(model.rawAttributes).filter(name =>
          !(name in columns) && !(table === 'cong_viec' && name === 'file_dinh_kem'));
        if (missing.length) throw new Error(
          'Schema cũ thiếu cột: ' + table + '.' + missing.join(', ') +
          '. Cần đối chiếu schema và tạo migration chuyển đổi trước khi tiếp tục.');
      }
      for (const model of models) {
        const table = model.getTableName();
        if (tables.includes(table)) continue;
        const attributes = { ...model.rawAttributes };
        // Introduced separately for databases created before file attachments.
        if (table === 'cong_viec') delete attributes.file_dinh_kem;
        await queryInterface.createTable(table, attributes, {
          charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci',
        });
      }
    } finally {
      await snapshot.close();
    }
  },
  async down() {
    throw new Error('Baseline tiếp nhận cả bảng có sẵn nên không thể tự động rollback. Khôi phục từ backup nếu cần.');
  },
};
