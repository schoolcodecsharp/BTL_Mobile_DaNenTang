# API nhóm

Backend sử dụng các bảng `nhom`, `thanh_vien_nhom`, `cong_viec_nhom` và
`phien_dang_nhap`. Giao diện chưa được cập nhật để gửi token trong thay đổi này.

## Chạy và kiểm thử

Từ thư mục `BE_BTL_Mobile`, cấu hình kết nối MySQL trong `.env`, sau đó:

```powershell
npm ci
npm run migrate:groups
npm test
npm run test:integration
npm start
```

Migration cần bảng `nguoi_dung` có sẵn. Chỉ tạo bảng còn thiếu và ràng buộc
thành viên duy nhất, không reset dữ liệu. Nếu dữ liệu cũ có thành viên trùng,
migration sẽ báo lỗi để xử lý thủ công, không tự xóa bản ghi.

Test tích hợp dùng server Express thật, MySQL thật và database tạm tên
`todo_groups_test_<random>`. Tài khoản MySQL cần quyền CREATE/DROP DATABASE.
Database test được dọn trong `finally`; không dùng dữ liệu của database ứng dụng.
Các lỗi `Injected ... failure` trong log test được chủ động tạo để kiểm tra rollback.

Swagger: `http://localhost:5257/api-docs`, nhóm **Teams**, nút **Authorize**.

## Xác thực

`POST /api/auth/login` với `{ "usernameOrEmail": "...", "password": "..." }`
trả về các trường tài khoản cũ, thêm `accessToken`, `tokenType: "Bearer"`, `expiresAt`.
Token có hiệu lực 24 giờ; database chỉ lưu SHA-256 của token.
Đăng ký vẫn trả về tài khoản; đăng nhập sau đăng ký để nhận token.

Mọi request `/api/teams` phải gửi `Authorization: Bearer <accessToken>`.
Không cần truyền `userId`. Nếu client cũ vẫn gửi `userId`, giá trị phải khớp
token; không dùng trường này làm căn cứ xác thực.
`POST /api/auth/logout` với token thu hồi phiên hiện tại.

Các API cá nhân cũ ngoài nhóm vẫn giữ cơ chế truy cập hiện có; thay đổi này
không phải đợt bổ sung xác thực cho toàn bộ hệ thống.

## Quyền truy cập

| Thao tác | Trưởng nhóm | Thành viên | Người ngoài |
|---|---|---|---|
| Xem nhóm, thành viên, công việc | Có | Có | Không |
| Sửa/xóa nhóm, thêm/xóa thành viên, chuyển trưởng nhóm | Có | Không | Không |
| Tạo/sửa/xóa/giao lại công việc | Có | Không | Không |
| Cập nhật trạng thái công việc | Có | Chỉ việc được giao | Không |
| Rời nhóm | Phải chuyển quyền trước | Có | Không |

Xóa thành viên/rời nhóm sẽ bỏ người nhận ở các công việc của thành viên đó,
giữ lại công việc. Xóa nhóm xóa cả thành viên và công việc trong một transaction.
Chuyển quyền cập nhật cả nhóm và vai trò hai thành viên trong một transaction.

## Các endpoint

| Method | Đường dẫn | Body |
|---|---|---|
| GET | `/api/teams` | — |
| POST | `/api/teams` | `{ "tenNhom": "Nhóm Mobile", "moTa": "Đồ án" }` |
| GET | `/api/teams/:teamId` | — |
| PUT | `/api/teams/:teamId` | `{ "tenNhom": "Tên mới", "moTa": "Mô tả" }` |
| DELETE | `/api/teams/:teamId` | — |
| POST | `/api/teams/:teamId/invite` | `{ "inviteEmail": "member@example.com" }` |
| POST | `/api/teams/:teamId/transfer-leader` | `{ "newLeaderId": 2 }` |
| DELETE | `/api/teams/:teamId/members/:memberId` | — |
| DELETE | `/api/teams/:teamId/leave` | — |
| GET | `/api/teams/:teamId/tasks` | — |
| POST | `/api/teams/:teamId/tasks` | `{ "tieuDe": "Viết báo cáo", "nguoiNhanId": 2, "mucDoUuTien": "CAO" }` |
| PUT | `/api/teams/:teamId/tasks/:taskId` | `{ "nguoiNhanId": 3, "hanHoanThanh": "2026-12-01T10:00:00+07:00" }` |
| PATCH | `/api/teams/:teamId/tasks/:taskId/status` | `{ "trangThai": "HOAN_THANH" }` |
| DELETE | `/api/teams/:teamId/tasks/:taskId` | — |

`memberId` là **ID người dùng**, không phải ID bản ghi thành viên.
`invite` giữ tên đường dẫn cũ nhưng **thêm tài khoản có sẵn trực tiếp**, không gửi
email và chưa có bước chấp nhận/từ chối. Không tạo tài khoản mới qua endpoint này.

Tạo công việc mặc định `CHUA_LAM`; đổi trạng thái bằng endpoint `/status`.
`nguoiNhanId: null` bỏ phân công. `PUT` công việc chỉ cập nhật trường được gửi;
trường được hỗ trợ: `tieuDe`, `moTa`, `nguoiNhanId`, `mucDoUuTien`, `hanHoanThanh`,
`fileDinhKem`. `fileDinhKem` tối đa 10 object `{url, filename, mimetype, size}`.
Danh sách nhóm trả `thanhViens: []`; lấy chi tiết để có danh sách thành viên.

Mã trả về: 200 đọc/chuyển quyền; 201 tạo; 204 sửa/xóa; 400 dữ liệu không hợp lệ;
401 thiếu/hết hạn token; 403 thiếu quyền; 404 không tồn tại; 409 trùng thành viên.

## Ví dụ PowerShell

```powershell
$api = 'http://localhost:5257'
$login = Invoke-RestMethod "$api/api/auth/login" -Method Post -ContentType 'application/json' -Body (@{
  usernameOrEmail = 'your-account'; password = 'your-password'
} | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
$team = Invoke-RestMethod "$api/api/teams" -Headers $headers -Method Post -ContentType 'application/json' -Body (@{
  tenNhom = 'Nhóm Mobile'
} | ConvertTo-Json)
Invoke-RestMethod "$api/api/teams/$($team.id)" -Headers $headers
```
