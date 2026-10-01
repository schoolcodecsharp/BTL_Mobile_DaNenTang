// Explicit local operator command; never called by registration or a migration.
require('../config/database');
const { NguoiDung, sequelize } = require('../models');

async function main() {
  const [flag, username, ...rest] = process.argv.slice(2);
  if (flag !== '--username' || !username?.trim() || rest.length) {
    throw new Error('Cách dùng: npm run admin:grant -- --username TEN_DANG_NHAP');
  }
  const user = await NguoiDung.findOne({ where: { ten_dang_nhap: username.trim() } });
  if (!user) throw new Error('Không tìm thấy tên đăng nhập này.');
  if (!user.trang_thai) throw new Error('Tài khoản đang bị khóa. Chỉ cấp quyền cho tài khoản hoạt động.');
  await user.update({ vai_tro: 'ADMIN' });
  console.log('Đã cấp quyền admin cho tài khoản ID ' + user.id + '.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
