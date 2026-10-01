'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('phien_dang_nhap')) {
      const columns = await queryInterface.describeTable('phien_dang_nhap');
      for (const name of ['token_hash', 'nguoi_dung_id', 'het_han']) {
        if (!columns[name]) throw new Error(`Existing phien_dang_nhap is missing ${name}; explicit repair migration required.`);
      }
      return;
    }
    await queryInterface.createTable('phien_dang_nhap', {
      token_hash: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      nguoi_dung_id: { type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'nguoi_dung', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      het_han: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down() {
    throw new Error('Rollback refused: this migration may adopt existing login sessions; dropping the table would invalidate existing data.');
  },
};
