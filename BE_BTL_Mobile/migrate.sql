-- ============================================================
-- Script tạo bảng mới cho tính năng nhóm và upload file
-- Chạy script này trong MySQL Workbench hoặc terminal MySQL
-- ============================================================

USE todo_list;

-- Thêm cột file_dinh_kem vào bảng cong_viec (nếu chưa có)
ALTER TABLE cong_viec
  ADD COLUMN IF NOT EXISTS file_dinh_kem TEXT DEFAULT NULL
    COMMENT 'JSON array of attachment objects: [{url, filename, mimetype, size}]';

-- Bảng nhóm
CREATE TABLE IF NOT EXISTS nhom (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ten_nhom        VARCHAR(100) NOT NULL,
  mo_ta           TEXT,
  truong_nhom_id  INT NOT NULL,
  ngay_tao        DATETIME,
  CONSTRAINT fk_nhom_truong FOREIGN KEY (truong_nhom_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bảng thành viên nhóm
CREATE TABLE IF NOT EXISTS thanh_vien_nhom (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nhom_id         INT NOT NULL,
  nguoi_dung_id   INT NOT NULL,
  vai_tro         ENUM('TRUONG_NHOM', 'THANH_VIEN') DEFAULT 'THANH_VIEN',
  ngay_tham_gia   DATETIME,
  CONSTRAINT fk_tv_nhom    FOREIGN KEY (nhom_id)       REFERENCES nhom(id)       ON DELETE CASCADE,
  CONSTRAINT fk_tv_nd      FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  UNIQUE KEY uq_nhom_nd (nhom_id, nguoi_dung_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bảng công việc nhóm
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
  file_dinh_kem   TEXT DEFAULT NULL
                    COMMENT 'JSON array of attachment objects',
  CONSTRAINT fk_cvn_nhom  FOREIGN KEY (nhom_id)       REFERENCES nhom(id)       ON DELETE CASCADE,
  CONSTRAINT fk_cvn_giao  FOREIGN KEY (nguoi_giao_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  CONSTRAINT fk_cvn_nhan  FOREIGN KEY (nguoi_nhan_id) REFERENCES nguoi_dung(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT 'Migration hoàn thành!' AS result;
