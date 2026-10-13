// Preparation must finish before the class presentation, 13/10/2026 at 08:00.
const date = value => new Date(`2026-10-${value}:00+07:00`);
const PERSONAL_SCHEDULE = {
  'Viết báo cáo': ['HOAN_THANH', '11T08:00', '12T20:00', '12T19:30'],
  'Làm slide': ['DANG_LAM', '12T18:00', '13T06:45', null],
  'Quay video': ['HOAN_THANH', '12T19:00', '12T21:30', '12T21:00'],
  'Kiểm tra báo cáo': ['CHUA_LAM', '13T06:30', '13T07:00', null],
  'In báo cáo': ['CHUA_LAM', '13T07:00', '13T07:20', null],
  'Gửi tài liệu': ['HOAN_THANH', '12T20:00', '12T22:00', '12T21:30'],
  'Ôn SQL': ['DANG_LAM', '12T14:00', '13T07:30', null],
  'Cài ứng dụng': ['HOAN_THANH', '12T18:00', '12T22:00', '12T21:45'],
  'Sửa trang đăng nhập': ['CHUA_LAM', '11T09:00', '12T18:00', null],
};
const GROUP_SCHEDULE = {
  'Vẽ sơ đồ hệ thống': ['HOAN_THANH', '12T17:00'],
  'Làm slide nhóm': ['DANG_LAM', '13T06:45'],
  'Kiểm tra phân công': ['HOAN_THANH', '12T22:00'],
  'Ôn cơ sở dữ liệu': ['DANG_LAM', '13T07:15'],
  'Tập thuyết trình': ['CHUA_LAM', '13T07:45'],
  'Chụp màn hình': ['HOAN_THANH', '12T22:30'],
  'Thống kê công việc': ['DANG_LAM', '13T07:20'],
  'Soạn câu hỏi': ['CHUA_LAM', '13T07:00'],
};
const reportTime = date('13T08:00');
function adjustPersonal(task) {
  const schedule = PERSONAL_SCHEDULE[task.title];
  return schedule ? { ...task, status: schedule[0], start: date(schedule[1]), due: date(schedule[2]), completed: schedule[3] ? date(schedule[3]) : null } : task;
}
function adjustGroup(task) {
  const schedule = GROUP_SCHEDULE[task.title];
  return schedule ? { ...task, status: schedule[0], due: date(schedule[1]) } : task;
}
module.exports = { adjustPersonal, adjustGroup, PERSONAL_SCHEDULE, GROUP_SCHEDULE, reportTime };
