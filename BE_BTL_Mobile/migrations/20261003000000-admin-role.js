'use strict';

module.exports = {
  async up(qi, S) {
    const columns = await qi.describeTable('nguoi_dung');
    if (!columns.vai_tro) {
      await qi.addColumn('nguoi_dung', 'vai_tro', {
        type: S.STRING(20), allowNull: false, defaultValue: 'USER',
      });
    } else if (columns.vai_tro.type.toUpperCase() !== 'VARCHAR(20)' ||
      columns.vai_tro.allowNull || columns.vai_tro.defaultValue !== 'USER') {
      throw new Error('nguoi_dung.vai_tro không khớp schema mong đợi. Cần migration đối chiếu riêng.');
    }
  },
  async down() {
    throw new Error('Không tự động xóa vai trò tài khoản. Dùng migration mới để tránh mất phân quyền admin.');
  },
};
