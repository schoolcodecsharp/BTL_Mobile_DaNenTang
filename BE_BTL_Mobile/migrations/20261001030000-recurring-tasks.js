'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('cong_viec');
    // Add each column independently so retrying is safe if MySQL committed partial DDL.
    if (!columns.lap_lai) {
      await queryInterface.addColumn('cong_viec', 'lap_lai', {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'KHONG',
      });
    }
    if (!columns.da_tao_lan_tiep) {
      await queryInterface.addColumn('cong_viec', 'da_tao_lan_tiep', {
        type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
      });
    }
  },
  async down() {
    throw new Error('Rollback refused: removing recurrence columns would lose scheduling state and could create duplicate tasks.');
  },
};
