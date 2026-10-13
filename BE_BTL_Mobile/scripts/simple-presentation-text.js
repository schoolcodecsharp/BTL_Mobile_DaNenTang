const SIMPLE_TASK_TEXT = [
  ['Chốt phạm vi ứng dụng To-Do List', 'Lập kế hoạch', 'Ghi các việc cần làm cho bài tập lớn.'],
  ['Vẽ sơ đồ quan hệ cơ sở dữ liệu', 'Vẽ sơ đồ dữ liệu', 'Vẽ các bảng và quan hệ giữa các bảng.'],
  ['Cài APK và kiểm tra kết nối backend', 'Cài ứng dụng', 'Cài app lên điện thoại và thử đăng nhập.'],
  ['Sắp xếp tài liệu học theo từng môn', 'Sắp xếp tài liệu', 'Chia tài liệu vào thư mục từng môn.'],
  ['Hoàn thiện báo cáo giao diện ứng dụng', 'Viết báo cáo', 'Viết nội dung và thêm ảnh vào báo cáo.'],
  ['Chuẩn bị slide thuyết trình bài tập lớn', 'Làm slide', 'Làm slide ngắn gọn cho buổi thuyết trình.'],
  ['Ôn JOIN và GROUP BY cho phần hỏi đáp', 'Ôn SQL', 'Ôn truy vấn và làm vài bài tập SQL.'],
  ['Lập kế hoạch chi tiêu tuần tới', 'Ghi chép chi tiêu', 'Ghi tiền ăn, đi lại và học tập.'],
  ['Quay video demo ứng dụng', 'Quay video', 'Quay các thao tác chính trên ứng dụng.'],
  ['Rà soát báo cáo trước khi nộp', 'Kiểm tra báo cáo', 'Đọc lại nội dung và sửa lỗi chính tả.'],
  ['In báo cáo và kiểm tra tệp nộp', 'In báo cáo', 'Kiểm tra bản cuối rồi in báo cáo.'],
  ['Mua vở ghi và bút cho tuần mới', 'Mua đồ dùng học tập', 'Mua một quyển vở và hai cây bút.'],
  ['Hoàn thành bài tập ngăn xếp', 'Làm bài tập', 'Làm nốt bài tập và nộp cho giảng viên.'],
  ['Gửi đề cương báo cáo cho nhóm', 'Gửi tài liệu', 'Gửi tài liệu cho các thành viên trong nhóm.'],
  ['Đọc lại ghi chú sau giờ học', 'Ôn bài', 'Đọc lại bài học mỗi tối khoảng 20 phút.'],
  ['Đi bộ 30 phút sau giờ học', 'Đi bộ', 'Đi bộ 30 phút sau giờ học.'],
  ['Dọn bàn học và sao lưu tài liệu', 'Dọn bàn học', 'Dọn bàn và sắp xếp lại đồ dùng mỗi tuần.'],
  ['Mua thêm chuột máy tính', 'Mua chuột máy tính', 'Chưa cần mua vì chuột cũ vẫn dùng tốt.'],
  ['Viết lại toàn bộ trang đăng nhập', 'Sửa trang đăng nhập', 'Tạm bỏ vì trang hiện tại đã dùng được.'],
  ['In bản nháp báo cáo cũ', 'In bản nháp', 'Bản nháp đã được thay bằng bản mới.'],
  ['Chốt sơ đồ kiến trúc FE và BE', 'Vẽ sơ đồ hệ thống', 'Vẽ cách ứng dụng kết nối với máy chủ.'],
  ['Hoàn thiện slide demo chức năng', 'Làm slide nhóm', 'Thêm ảnh và nội dung trình bày của nhóm.'],
  ['Kiểm thử quyền phân công trong nhóm', 'Kiểm tra phân công', 'Thử giao việc và đổi trạng thái công việc.'],
  ['Chuẩn bị câu trả lời phần database', 'Ôn cơ sở dữ liệu', 'Ôn các bảng, khóa chính và khóa ngoại.'],
  ['Tổng duyệt thuyết trình trên điện thoại', 'Tập thuyết trình', 'Tập nói và thử demo trước buổi trình bày.'],
  ['Gửi ảnh màn hình cho người làm báo cáo', 'Chụp màn hình', 'Chụp các trang trong app và gửi cho nhóm.'],
  ['Soạn ví dụ INNER JOIN và LEFT JOIN', 'Làm ví dụ JOIN', 'Làm ví dụ nối hai bảng dữ liệu.'],
  ['Giải bài thống kê công việc theo trạng thái', 'Thống kê công việc', 'Đếm số việc theo từng trạng thái.'],
  ['Tổng hợp câu hỏi ôn tập SQL', 'Soạn câu hỏi', 'Ghi các câu hỏi SQL để cùng ôn tập.'],
];
function simplifyTask(task) {
  const text = SIMPLE_TASK_TEXT.find(([title]) => title === task.title);
  return text ? { ...task, title: text[1], description: text[2] } : task;
}
module.exports = { SIMPLE_TASK_TEXT, simplifyTask };
