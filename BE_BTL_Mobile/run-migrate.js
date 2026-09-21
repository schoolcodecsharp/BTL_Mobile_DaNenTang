/**
 * Run this script once to apply database migrations.
 * Usage: node run-migrate.js
 */
require('dotenv').config();
const { sequelize, Nhom, ThanhVienNhom, CongViecNhom } = require('./models');

async function migrate() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected!');

    // Add file_dinh_kem to cong_viec if not exists (safe for older MySQL)
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cong_viec' AND COLUMN_NAME = 'file_dinh_kem'
    `);
    if (columns.length === 0) {
      await sequelize.query(`ALTER TABLE cong_viec ADD COLUMN file_dinh_kem TEXT DEFAULT NULL`);
      console.log('✓ cong_viec.file_dinh_kem column added');
    } else {
      console.log('✓ cong_viec.file_dinh_kem already exists');
    }

    // Create nhom table
    await Nhom.sync({ alter: false, force: false });
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS nhom (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        ten_nhom        VARCHAR(100) NOT NULL,
        mo_ta           TEXT,
        truong_nhom_id  INT NOT NULL,
        ngay_tao        DATETIME,
        CONSTRAINT fk_nhom_truong FOREIGN KEY (truong_nhom_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ nhom table ensured');

    // Create thanh_vien_nhom table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS thanh_vien_nhom (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nhom_id         INT NOT NULL,
        nguoi_dung_id   INT NOT NULL,
        vai_tro         ENUM('TRUONG_NHOM', 'THANH_VIEN') DEFAULT 'THANH_VIEN',
        ngay_tham_gia   DATETIME,
        CONSTRAINT fk_tv_nhom  FOREIGN KEY (nhom_id)       REFERENCES nhom(id)       ON DELETE CASCADE,
        CONSTRAINT fk_tv_nd    FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
        UNIQUE KEY uq_nhom_nd (nhom_id, nguoi_dung_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ thanh_vien_nhom table ensured');

    // Create cong_viec_nhom table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS cong_viec_nhom (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        nhom_id         INT NOT NULL,
        nguoi_giao_id   INT NOT NULL,
        nguoi_nhan_id   INT,
        tieu_de         VARCHAR(200) NOT NULL,
        mo_ta           TEXT,
        muc_do_uu_tien  VARCHAR(20) DEFAULT 'TRUNG_BINH',
        trang_thai      VARCHAR(20) DEFAULT 'CHUA_LAM',
        han_hoan_thanh  DATETIME,
        ngay_tao        DATETIME,
        ngay_cap_nhat   DATETIME,
        file_dinh_kem   TEXT DEFAULT NULL,
        CONSTRAINT fk_cvn_nhom FOREIGN KEY (nhom_id)       REFERENCES nhom(id)       ON DELETE CASCADE,
        CONSTRAINT fk_cvn_giao FOREIGN KEY (nguoi_giao_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
        CONSTRAINT fk_cvn_nhan FOREIGN KEY (nguoi_nhan_id) REFERENCES nguoi_dung(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✓ cong_viec_nhom table ensured');

    console.log('\n✅ Migration hoàn thành!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration thất bại:', err.message);
    process.exit(1);
  }
}

migrate();
