module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('thanh_vien_nhom');
    const exists = indexes.some(index => index.unique &&
      index.fields.length === 2 &&
      ['nhom_id', 'nguoi_dung_id'].every(name => index.fields.some(field => field.attribute === name)));
    if (!exists) await queryInterface.addIndex('thanh_vien_nhom',
      ['nhom_id', 'nguoi_dung_id'], { unique: true, name: 'uq_nhom_nd' });
  },
  async down() {
    throw new Error('Ràng buộc này có thể đã tồn tại trước migrations. Dùng migration mới để thay đổi.');
  },
};
