-- Tạo database nếu chưa có
CREATE DATABASE IF NOT EXISTS todo_list CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE todo_list;

-- ── Tạo bảng ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS nguoi_dung (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ten_dang_nhap VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  mat_khau VARCHAR(255) NOT NULL,
  ho_ten VARCHAR(100),
  anh_dai_dien VARCHAR(255),
  ngay_tao DATETIME,
  trang_thai BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS danh_muc (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nguoi_dung_id INT NOT NULL,
  ten_danh_muc VARCHAR(100) NOT NULL,
  mo_ta VARCHAR(255),
  mau_sac VARCHAR(20),
  FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cong_viec (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nguoi_dung_id INT NOT NULL,
  danh_muc_id INT,
  tieu_de VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  muc_do_uu_tien VARCHAR(20) DEFAULT 'TRUNG_BINH',
  trang_thai VARCHAR(20) DEFAULT 'CHUA_LAM',
  ngay_bat_dau DATETIME,
  han_hoan_thanh DATETIME,
  ngay_hoan_thanh DATETIME,
  ngay_tao DATETIME,
  ngay_cap_nhat DATETIME,
  FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  FOREIGN KEY (danh_muc_id) REFERENCES danh_muc(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS nhac_nho (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cong_viec_id INT NOT NULL,
  thoi_gian_nhac DATETIME NOT NULL,
  loai_nhac VARCHAR(20),
  da_gui BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (cong_viec_id) REFERENCES cong_viec(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thong_bao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nguoi_dung_id INT NOT NULL,
  cong_viec_id INT,
  tieu_de VARCHAR(200) NOT NULL,
  noi_dung TEXT,
  da_doc BOOLEAN DEFAULT FALSE,
  ngay_tao DATETIME,
  FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  FOREIGN KEY (cong_viec_id) REFERENCES cong_viec(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lich_su_cong_viec (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cong_viec_id INT NOT NULL,
  trang_thai_cu VARCHAR(30),
  trang_thai_moi VARCHAR(30),
  thoi_gian_thay_doi DATETIME,
  FOREIGN KEY (cong_viec_id) REFERENCES cong_viec(id) ON DELETE CASCADE
);

-- ── Dữ liệu mẫu ───────────────────────────────────────────

-- Mật khẩu: password123 (đã hash bằng bcrypt)
INSERT INTO nguoi_dung (ten_dang_nhap, email, mat_khau, ho_ten, ngay_tao, trang_thai) VALUES
('duong', 'duong@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHWy', 'Trần Bình Dương', NOW(), TRUE),
('admin', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHWy', 'Quản Trị Viên', NOW(), TRUE),
('user1', 'user1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHWy', 'Nguyễn Văn A', NOW(), TRUE);

-- Danh mục cho user 1 (duong)
INSERT INTO danh_muc (nguoi_dung_id, ten_danh_muc, mo_ta, mau_sac) VALUES
(1, 'Công việc', 'Các task liên quan đến công việc', '#4F46E5'),
(1, 'Học tập', 'Các task học tập và nghiên cứu', '#06B6D4'),
(1, 'Cá nhân', 'Công việc cá nhân hàng ngày', '#10B981'),
(2, 'Dự án', 'Quản lý dự án', '#F59E0B');

-- Công việc cho user 1 (duong)
INSERT INTO cong_viec (nguoi_dung_id, danh_muc_id, tieu_de, mo_ta, muc_do_uu_tien, trang_thai, ngay_bat_dau, han_hoan_thanh, ngay_tao, ngay_cap_nhat) VALUES
(1, 1, 'Hoàn thiện báo cáo BTL Mobile', 'Viết báo cáo cuối kỳ môn lập trình mobile', 'CAO', 'DANG_LAM', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW()),
(1, 1, 'Code màn hình đăng nhập', 'Thiết kế và code UI màn hình login', 'CAO', 'HOAN_THANH', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), NOW(), NOW()),
(1, 2, 'Ôn tập môn Cơ sở dữ liệu', 'Ôn lại các kiến thức về SQL và thiết kế CSDL', 'TRUNG_BINH', 'CHUA_LAM', NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), NOW(), NOW()),
(1, 2, 'Làm bài tập React Native', 'Hoàn thành các bài tập thực hành React Native', 'CAO', 'DANG_LAM', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), NOW(), NOW()),
(1, 3, 'Mua sắm cuối tuần', 'Đi siêu thị mua đồ dùng cần thiết', 'THAP', 'CHUA_LAM', NULL, DATE_ADD(NOW(), INTERVAL 4 DAY), NOW(), NOW()),
(1, NULL, 'Tập thể dục buổi sáng', 'Chạy bộ 30 phút mỗi ngày', 'TRUNG_BINH', 'CHUA_LAM', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), NOW(), NOW()),
(1, 1, 'Review code pull request', 'Review và merge code từ các thành viên nhóm', 'CAO', 'QUA_HAN', DATE_ADD(NOW(), INTERVAL -3 DAY), DATE_ADD(NOW(), INTERVAL -1 DAY), NOW(), NOW());

-- Nhắc nhở
INSERT INTO nhac_nho (cong_viec_id, thoi_gian_nhac, da_gui) VALUES
(1, DATE_ADD(NOW(), INTERVAL 1 DAY), FALSE),
(2, DATE_ADD(NOW(), INTERVAL 30 MINUTE), TRUE),
(4, DATE_ADD(NOW(), INTERVAL 2 DAY), FALSE);

-- Thông báo
INSERT INTO thong_bao (nguoi_dung_id, cong_viec_id, tieu_de, noi_dung, da_doc, ngay_tao) VALUES
(1, 1, 'Nhắc nhở công việc sắp đến hạn', 'Công việc "Hoàn thiện báo cáo BTL Mobile" sẽ đến hạn sau 7 ngày', FALSE, NOW()),
(1, 7, 'Công việc quá hạn!', 'Công việc "Review code pull request" đã quá hạn', FALSE, NOW()),
(1, 2, 'Hoàn thành công việc', 'Bạn đã hoàn thành công việc "Code màn hình đăng nhập"', TRUE, DATE_ADD(NOW(), INTERVAL -1 DAY));

-- Lịch sử công việc
INSERT INTO lich_su_cong_viec (cong_viec_id, trang_thai_cu, trang_thai_moi, thoi_gian_thay_doi) VALUES
(2, 'CHUA_LAM', 'DANG_LAM', DATE_ADD(NOW(), INTERVAL -2 DAY)),
(2, 'DANG_LAM', 'HOAN_THANH', DATE_ADD(NOW(), INTERVAL -1 DAY)),
(1, 'CHUA_LAM', 'DANG_LAM', NOW()),
(7, 'CHUA_LAM', 'QUA_HAN', NOW());
