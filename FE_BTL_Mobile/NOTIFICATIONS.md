# Nhắc việc trên điện thoại

Ứng dụng dùng `expo-notifications` để đặt lịch nhắc công việc cá nhân trên
Android/iOS. Sau khi đã đặt lịch, hệ điều hành hiển thị thông báo kể cả khi app
đóng hoặc điện thoại không có mạng.

- Đăng nhập và cho phép nhận thông báo khi được hỏi.
- Công việc được nhắc trước hạn 1 ngày, 1 giờ, 10 phút và đúng hạn.
  Chỉ đặt các mốc còn ở tương lai; không gửi bù các mốc đã qua.
  Không đặt lịch cho việc quá hạn hoặc đã hoàn thành.
- Sửa hạn/tiêu đề cập nhật lịch; hoàn thành, xóa hoặc đăng xuất hủy lịch tương ứng.
- Bật/tắt trong **Cá nhân → Thông báo**; lựa chọn được lưu riêng cho từng tài khoản
  trên thiết bị. Nếu đã từ chối quyền, bật lại trong Cài đặt điện thoại.
- Bấm thông báo mở công việc tương ứng sau khi đăng nhập đúng tài khoản.
- Chỉ đặt tối đa 60 lịch gần nhất để giữ dưới giới hạn lịch của iOS. Các lịch tiếp
  theo được bổ sung khi mở lại app hoặc tải lại danh sách công việc.
- Thay đổi từ thiết bị khác được cập nhật khi app lấy lại danh sách. Đây là nhắc
  cục bộ; chưa gửi thông báo đẩy từ máy chủ khi app đã đóng.

## Thông báo nhóm trên điện thoại

- Khi app ở foreground và đã đăng nhập, app kiểm tra thông báo backend mỗi
  15 giây trên mọi màn hình. Thông báo mới chưa đọc được hiển thị trên điện thoại
  nếu nút Thông báo đang bật và đã có quyền hệ điều hành.
- Lần tải đầu tiên trên thiết bị chỉ ghi nhận thông báo hiện có làm mốc, không
  phát lại toàn bộ lịch sử. Mốc được lưu riêng cho từng tài khoản; lần mở sau
  sẽ hiển thị thông báo mới chưa đọc phát sinh sau mốc này.
- Bấm thông báo mở đúng nhóm/công việc và đánh dấu đã đọc trên backend.
  Lịch sử nhóm vẫn lấy từ backend, không tạo bản sao trong lịch sử nhắc cá nhân.
- Khi chuyển app sang nền hoặc đóng app, việc kiểm tra dừng. Muốn nhận thông
  báo nhóm ngay trong trạng thái này cần triển khai push FCM/APNs; dự án hiện
  chưa có cấu hình Firebase/FCM, nên không đảm bảo nhận khi app đang đóng.

## Chạy và kiểm tra trên thiết bị

Chạy `npm install` trong thư mục frontend. Vì có thêm thư viện native và plugin,
phải build lại bản app riêng nếu đang sử dụng development/release build cũ
(`npx expo run:android` với Android SDK đã cài, hoặc quy trình EAS Build của nhóm).
Không cần Firebase hay push token cho tính năng nhắc cục bộ này.

Trên Expo Go Android, app tắt tính năng nhắc việc và không nạp thư viện thông báo
vì phiên bản hiện tại khởi tạo push listener ngay khi import, gây lỗi trong Expo Go.
Các chức năng quản lý công việc vẫn hoạt động; để dùng nhắc việc, cài bản build riêng.

1. Cài bản build mới trên điện thoại, đăng nhập và cấp quyền thông báo.
2. Tạo việc có hạn sau 2–3 phút. Về màn hình chính, khóa máy và kiểm tra thông báo.
3. Bấm thông báo: kiểm tra mở đúng công việc (đăng nhập trước nếu app khởi động lại).
4. Tạo việc khác, sửa hạn rồi kiểm tra giờ cũ không còn nhắc.
5. Kiểm tra hoàn thành, xóa, tắt thông báo và đăng xuất đều hủy lịch đang chờ.
6. Bật lại, khởi động lại app, thử từ chối quyền và thử không có mạng sau khi đặt lịch.

Không dùng “Buộc dừng” của Android để mô phỏng đóng app thông thường. Chế độ tiết
kiệm pin và quyền của hệ điều hành có thể làm trễ thông báo; cấu hình hiện tại không
có khai báo quyền báo thức chính xác trên Android. Người dùng cần cho phép
“Báo thức và lời nhắc” trong cài đặt hệ thống để hạn chế nhắc trễ.

## Kiểm tra tự động

`npm test` kiểm tra quy tắc thời gian, tránh lịch trùng, cập nhật/hủy lịch, lưu tùy
chọn, đổi tài khoản, kết quả tải cũ, từ chối quyền và nền tảng web. Các kiểm tra này
dùng bộ giả lập API thông báo, không thay thế kiểm thử hiển thị trên máy thật.
