# Trang quản trị tài khoản trên web

1. Trong backend: `npm ci`, rồi `npm run db:migrate`.
2. Cấp quyền cho tài khoản có sẵn: `npm run admin:grant -- --username TEN_DANG_NHAP`.
   Đây là lệnh của người vận hành máy chủ, không phải API công khai. Không có tài khoản
   hoặc mật khẩu admin mặc định; đăng ký thông thường luôn có vai trò USER.
3. Chạy backend (`npm start`) và frontend (`npm run web` trong FE_BTL_Mobile).
4. Mở `http://localhost:8081/admin` và đăng nhập tài khoản được cấp quyền.

Trang chỉ quản lý tài khoản: thống kê, tìm kiếm, lọc, phân trang, sửa họ tên/email,
khóa/mở khóa người dùng. Không xóa tài khoản và không đổi vai trò qua giao diện.
Không thể khóa quản trị viên trên trang này.

API `/api/admin/*` yêu cầu session hợp lệ và vai trò ADMIN đọc từ database ở mỗi request.
Trang không dùng dữ liệu mẫu. Tài khoản thường nhận 403, chưa đăng nhập/hết hạn nhận 401.
Đây là bảo vệ cho API admin mới, không phải đợt rà soát toàn bộ API cũ.

Kiểm tra: `npm run test:admin` và `npm run db:check` tạo database tạm riêng rồi xóa.
