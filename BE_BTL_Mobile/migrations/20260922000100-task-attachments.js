module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('cong_viec');
    if (!columns.file_dinh_kem) {
      await queryInterface.addColumn('cong_viec', 'file_dinh_kem', {
        type: Sequelize.TEXT, allowNull: true, defaultValue: null,
      });
    }
  },
  async down() {
    throw new Error('Cột file_dinh_kem có thể chứa dữ liệu cũ. Viết migration mới nếu cần loại bỏ, sau khi sao lưu.');
  },
};
