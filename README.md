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
npm run dev     # Development (nodemon)
npm start       # Production
```

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
