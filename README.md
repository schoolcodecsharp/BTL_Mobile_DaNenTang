# To-Do List – Ứng dụng Quản lý Công việc

Ứng dụng mobile quản lý công việc cá nhân, xây dựng với **React Native (Expo)** cho frontend và **Node.js (Express)** cho backend API.

## Cấu trúc dự án

```
To-Do-List/
├── BE_BTL_Mobile/    # Backend – Node.js + Express + Sequelize + MySQL
├── FE_BTL_Mobile/    # Frontend – React Native + Expo SDK 57
└── README.md
```

## Backend (Node.js)

### Yêu cầu
- Node.js 18+
- MySQL 8.0+

### Cài đặt & Chạy

```powershell
cd BE_BTL_Mobile

# Sửa file .env với thông tin database của bạn
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=todo_list
# DB_USER=root
# DB_PASSWORD=your_password
# PORT=5257

npm install
npm run db:create # Chỉ cần khi database chưa tồn tại
npm run db:migrate
npm run dev     # Development (nodemon)
npm start       # Production
```

### Đồng bộ CSDL khi làm việc nhóm

Sau khi pull code, chạy trong thư mục backend:

```powershell
git pull
cd BE_BTL_Mobile
npm ci
npm run db:migrate
npm run db:status
```

Nếu đã đứng trong thư mục backend thì bỏ bước cd. Mỗi thành viên tự cấu hình
`.env` theo MySQL của mình. Không chia sẻ mật khẩu qua Git.
Migration đồng bộ **cấu trúc database**, không sao chép dữ liệu cá nhân giữa các máy.
Git pull không tự chạy migration. Bảng `SequelizeMeta` ghi lại các file đã áp dụng.

Khi thay đổi bảng/cột/index/khóa ngoại:

1. Tạo file: `npm run db:migration:create -- --name add-example-column`.
2. Viết thao tác trong `up` và thao tác hoàn tác trong `down`, cập nhật model tương ứng.
3. Kiểm tra trên database thử nghiệm, chạy migrate lần hai để xác nhận không chạy lặp.
4. Commit cả migration, model và lockfile (nếu dependency thay đổi). Không sửa migration đã chia sẻ.

Các migration khởi đầu tiếp nhận 9 bảng hiện tại, tạo bảng còn thiếu, bổ sung
`cong_viec.file_dinh_kem` và ràng buộc thành viên nhóm không trùng.
Baseline kiểm tra tên cột của bảng có sẵn; không tự sửa kiểu cột, khóa ngoại hoặc
dữ liệu cũ khác biệt. Nếu báo thiếu cột hoặc trùng thành viên, cần đối chiếu và xử lý
bằng migration chuyển đổi riêng trước khi tiếp tục. Sao lưu database hiện có trước lần đầu.

MySQL có thể commit từng thao tác DDL: nếu lỗi giữa chừng, kiểm tra schema trước khi chạy lại.
Ba migration khởi đầu cố ý chặn rollback vì có thể tiếp nhận cấu trúc/dữ liệu đã tồn tại.
Migration mới có thể dùng `npm run db:undo` nếu đã viết `down` an toàn.
Không dùng `sync({ alter: true })`, `sync({ force: true })` hoặc script SQL thủ công
để đồng bộ schema. `migrate.sql` chỉ giữ làm tài liệu lịch sử.

Tài liệu: [Sequelize migrations](https://sequelize.org/docs/v6/other-topics/migrations/).

### API Endpoints

| Method | Route | Mô tả |
|--------|-------|--------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET/POST | `/api/users/{userId}/tasks` | Danh sách / Tạo công việc |
| GET/PUT/DELETE | `/api/users/{userId}/tasks/{id}` | Chi tiết / Sửa / Xóa |
| GET/POST | `/api/users/{userId}/categories` | Danh mục |
| GET/PUT/DELETE | `/api/users/{userId}/categories/{id}` | Chi tiết danh mục |
| GET/POST | `/api/users/{userId}/notifications` | Thông báo |
| PATCH | `/api/users/{userId}/notifications/{id}/read` | Đánh dấu đã đọc |
| GET/POST | `/api/tasks/{taskId}/reminders` | Nhắc nhở |
| GET/PUT/DELETE | `/api/tasks/{taskId}/reminders/{id}` | Chi tiết nhắc nhở |
| GET/POST/DELETE | `/api/tasks/{taskId}/history` | Lịch sử công việc |
| GET/PUT/DELETE | `/api/users`, `/api/users/{id}` | Quản lý người dùng |

### Chạy test

```bash
npm test
```

## Frontend (React Native / Expo)

Xem [FE_BTL_Mobile/README.md](FE_BTL_Mobile/README.md) để biết chi tiết.

```powershell
cd FE_BTL_Mobile
npm install
Copy-Item .env.example .env.local   # sửa EXPO_PUBLIC_API_URL nếu cần
npm run web                          # hoặc npm start cho mobile
```

## Lưu ý

- Backend hiện chưa có JWT/session token. Đăng nhập trả về thông tin user nhưng chưa bảo vệ API bằng token.
- Home/Explore tabs trên frontend hiện là template mẫu.
- CORS mặc định cho phép `localhost:8081`. Sửa `CORS_ORIGINS` trong `.env` nếu cần.
