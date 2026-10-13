const assert = require('node:assert/strict');
const { simplifyTask } = require('./simple-presentation-text');
const { adjustPersonal, adjustGroup } = require('./presentation-schedule');
function makeFixture(now = new Date()) {
  const day = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  function at(offset, hour = 20, minute = 0) {
    return new Date(Date.parse(`${day}T00:00:00+07:00`) + offset * 86400000 + hour * 3600000 + minute * 60000);
  }
  const categories = [
    ['Học tập', 'Ôn tập và bài thực hành trên lớp.', '#6366F1'],
    ['Dự án Mobile', 'Báo cáo, kiểm thử và trình bày ứng dụng To-Do List.', '#0EA5E9'],
    ['Cá nhân', 'Sức khỏe và kế hoạch sinh hoạt.', '#10B981'],
    ['Sinh hoạt', 'Mua sắm, việc nhà và những việc cần làm.', '#F59E0B'],
  ];
  // Dates relative to the presentation day, explicitly in Vietnam time.
  const definitions = [
    ['Chốt phạm vi ứng dụng To-Do List', 'Dự án Mobile', 'CAO', 'HOAN_THANH', -4, -3,
      'Đã thống nhất các chức năng cần trình bày: công việc cá nhân, lịch, nhắc việc, nhóm và thùng rác.'],
    ['Vẽ sơ đồ quan hệ cơ sở dữ liệu', 'Học tập', 'CAO', 'HOAN_THANH', -4, -2,
      'Đã đối chiếu khóa chính, khóa ngoại và quan hệ giữa tài khoản, công việc, danh mục, nhóm và thông báo.'],
    ['Cài APK và kiểm tra kết nối backend', 'Dự án Mobile', 'TRUNG_BINH', 'HOAN_THANH', -3, -1,
      'Đã cài ứng dụng trên Android, đăng nhập và kiểm tra dữ liệu qua cùng mạng nội bộ.'],
    ['Sắp xếp tài liệu học theo từng môn', 'Học tập', 'THAP', 'HOAN_THANH', -2, -1,
      'Đã gom slide và bài thực hành vào thư mục từng môn, đặt tên theo tuần để dễ tìm khi ôn tập.'],
    ['Hoàn thiện báo cáo giao diện ứng dụng', 'Dự án Mobile', 'CAO', 'DANG_LAM', -1, 2,
      'Đang bổ sung ảnh Trang chủ, Công việc, Lịch và Nhóm. Còn phần giải thích bộ lọc và thao tác khôi phục.'],
    ['Chuẩn bị slide thuyết trình bài tập lớn', 'Dự án Mobile', 'CAO', 'DANG_LAM', -1, 3,
      'Đã có dàn ý: bài toán, kiến trúc, cơ sở dữ liệu và demo. Cần rút gọn chữ và thêm ảnh thao tác trên điện thoại.'],
    ['Ôn JOIN và GROUP BY cho phần hỏi đáp', 'Học tập', 'TRUNG_BINH', 'DANG_LAM', 0, 2,
      'Làm ví dụ nối công việc với danh mục và thống kê theo trạng thái; giải thích vì sao dùng LEFT JOIN.'],
    ['Lập kế hoạch chi tiêu tuần tới', 'Cá nhân', 'THAP', 'DANG_LAM', 0, 3,
      'Đã tổng hợp tiền ăn và đi lại. Còn khoản in báo cáo, đồ dùng học tập và dự phòng.'],
    ['Quay video demo ứng dụng', 'Dự án Mobile', 'CAO', 'CHUA_LAM', 1, 4,
      'Quay video 3–5 phút gồm tạo việc, đổi trạng thái, xem bảng, nhắc việc và khôi phục từ thùng rác.'],
    ['Rà soát báo cáo trước khi nộp', 'Học tập', 'CAO', 'CHUA_LAM', 2, 5,
      'Kiểm tra mục lục, số hình, lỗi chính tả và tài liệu tham khảo; đảm bảo mô tả đúng chức năng thực tế.'],
    ['In báo cáo và kiểm tra tệp nộp', 'Học tập', 'TRUNG_BINH', 'CHUA_LAM', 4, 6,
      'Chuẩn bị báo cáo PDF, slide và APK. Mở thử từng tệp; không đưa mật khẩu hoặc tệp môi trường vào gói nộp.'],
    ['Mua vở ghi và bút cho tuần mới', 'Sinh hoạt', 'THAP', 'CHUA_LAM', 1, 1,
      'Kiểm tra đồ dùng còn thiếu; mua một vở ghi và hai bút, tránh mua trùng vật dụng đang có.'],
    ['Hoàn thành bài tập ngăn xếp', 'Học tập', 'CAO', 'DANG_LAM', -4, -1,
      'Bài đã quá hạn; còn trường hợp ngăn xếp rỗng. Cần làm nốt, kiểm tra kết quả rồi nộp bổ sung.'],
    ['Gửi đề cương báo cáo cho nhóm', 'Dự án Mobile', 'TRUNG_BINH', 'CHUA_LAM', -3, -1,
      'Chưa gửi đúng hẹn. Cần hoàn thiện dàn ý ngắn và chia sẻ cho các thành viên để tránh viết trùng nội dung.'],
    ['Đọc lại ghi chú sau giờ học', 'Học tập', 'THAP', 'CHUA_LAM', 1, 1,
      'Mỗi tối dành 20 phút đọc ghi chú và ghi ba nội dung chưa hiểu để hỏi trong buổi học sau.', 'HANG_NGAY'],
    ['Đi bộ 30 phút sau giờ học', 'Cá nhân', 'THAP', 'DANG_LAM', 0, 1,
      'Duy trì vận động nhẹ mỗi ngày, mang nước và nghỉ mắt khỏi màn hình sau buổi học hoặc lập trình.', 'HANG_NGAY'],
    ['Dọn bàn học và sao lưu tài liệu', 'Sinh hoạt', 'TRUNG_BINH', 'CHUA_LAM', 1, 5,
      'Mỗi tuần lau bàn, sắp xếp dây sạc và sao lưu báo cáo cùng tài liệu học vào thư mục riêng.', 'HANG_TUAN'],
    ['Mua thêm chuột máy tính', 'Sinh hoạt', 'THAP', 'CHUA_LAM', -3, 3,
      'Đã bỏ kế hoạch mua vì chuột hiện tại vẫn dùng tốt; giữ trong thùng rác để minh họa khôi phục.', 'KHONG', true],
    ['Viết lại toàn bộ trang đăng nhập', 'Dự án Mobile', 'TRUNG_BINH', 'CHUA_LAM', -3, 4,
      'Hủy phương án viết lại toàn bộ vì giao diện hiện tại đáp ứng yêu cầu; chuyển sang kiểm thử luồng đăng nhập.', 'KHONG', true],
    ['In bản nháp báo cáo cũ', 'Học tập', 'THAP', 'HOAN_THANH', -4, -2,
      'Bản nháp đã được thay bằng báo cáo cập nhật; chuyển công việc cũ vào thùng rác.', 'KHONG', true],
  ];
  const tasks = definitions.map(([title, category, priority, status, start, due, description, recurrence = 'KHONG', trash = false]) => adjustPersonal(simplifyTask({
    title, category, priority, status, description, recurrence, trash,
    start: at(start, 8), due: at(due),
    completed: status === 'HOAN_THANH' ? at(due, 18) : null,
    created: at(Math.min(start - 1, -5), 7), deleted: trash ? at(-1, 21) : null,
  })));
  const groups = [
    { name: 'Nhóm bài tập lớn Mobile', description: 'Dữ liệu mẫu: phân công báo cáo, kiểm thử và chuẩn bị buổi thuyết trình.', leader: 'demo', tasks: [
      ['Chốt sơ đồ kiến trúc FE và BE', 'HOAN_THANH', 'peer1', -2, 'CAO', 'Đã thống nhất Expo cho giao diện, Express cho API và MySQL cho lưu trữ.'],
      ['Hoàn thiện slide demo chức năng', 'DANG_LAM', 'demo', 2, 'CAO', 'Ghép ảnh thao tác, ghi thứ tự demo và giới hạn phần trình bày trong 5 phút.'],
      ['Kiểm thử quyền phân công trong nhóm', 'DANG_LAM', 'peer1', 2, 'CAO', 'Kiểm tra trưởng nhóm tạo việc và người được giao đổi trạng thái; thành viên khác chỉ xem.'],
      ['Chuẩn bị câu trả lời phần database', 'CHUA_LAM', 'demo', 3, 'TRUNG_BINH', 'Giải thích các khóa ngoại, migration, phiên đăng nhập và cách giữ dữ liệu khi cập nhật.'],
      ['Tổng duyệt thuyết trình trên điện thoại', 'CHUA_LAM', 'peer2', 4, 'CAO', 'Chạy kịch bản từ đầu đến cuối, kiểm tra mạng, chữ trên màn hình và thời lượng từng phần.'],
      ['Gửi ảnh màn hình cho người làm báo cáo', 'CHUA_LAM', 'demo', -1, 'TRUNG_BINH', 'Việc đã trễ hẹn; cần chụp lại các màn hình mới và gửi để hoàn thiện báo cáo.'],
    ] },
    { name: 'Nhóm ôn tập Cơ sở dữ liệu', description: 'Dữ liệu mẫu: chia sẻ bài luyện tập SQL và hỗ trợ ôn phần hỏi đáp.', leader: 'peer1', tasks: [
      ['Soạn ví dụ INNER JOIN và LEFT JOIN', 'HOAN_THANH', 'peer2', -1, 'TRUNG_BINH', 'Đã chuẩn bị dữ liệu nhỏ và kết quả để so sánh sự khác nhau của hai phép nối.'],
      ['Giải bài thống kê công việc theo trạng thái', 'DANG_LAM', 'demo', 2, 'TRUNG_BINH', 'Viết GROUP BY và COUNT, đối chiếu kết quả với các bộ đếm trên ứng dụng.'],
      ['Tổng hợp câu hỏi ôn tập SQL', 'CHUA_LAM', 'peer1', 3, 'THAP', 'Mỗi thành viên góp ba câu hỏi về truy vấn, khóa ngoại và transaction.'],
    ] },
  ].map(group => ({ ...group, tasks: group.tasks.map(([title, status, assignee, due, priority, description]) => adjustGroup(simplifyTask({
    title, status, assignee, due: at(due), priority, description,
  }))) }));
  assert.equal(tasks.length, 20);
  assert.equal(new Set(tasks.map(task => task.title)).size, tasks.length);
  for (const task of tasks) {
    assert(task.created <= task.start && task.start < task.due);
    assert(!task.completed || (task.completed >= task.start && task.completed <= task.due && task.completed < now));
    assert(categories.some(([name]) => name === task.category));
    assert(task.description.length >= 10);
  }
  return { day, categories, tasks, groups, at };
}
module.exports = { makeFixture };
