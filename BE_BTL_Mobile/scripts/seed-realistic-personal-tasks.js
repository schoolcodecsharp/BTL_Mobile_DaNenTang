// Explicit, account-scoped local demo import. No schema, session, or reminder changes.
// Preview: node scripts/seed-realistic-personal-tasks.js --email demo@example.com
// Apply:   node scripts/seed-realistic-personal-tasks.js --email demo@example.com --apply
// Re-running preserves existing rows (including tasks subsequently moved to trash).
require('../config/database');
const assert = require('node:assert/strict');
const { sequelize, NguoiDung, DanhMuc, CongViec } = require('../models');

const CREATED_AT = new Date('2026-10-10T07:00:00+07:00');
const CATEGORIES = [
  { name: 'Học tập', description: 'Bài tập, ôn tập và tài liệu học trên lớp.', color: '#6366F1' },
  { name: 'Dự án Mobile', description: 'Phát triển, kiểm thử và hoàn thiện bài tập lớn Mobile.', color: '#0EA5E9' },
  { name: 'Cá nhân', description: 'Thói quen và kế hoạch cá nhân.', color: '#10B981' },
  { name: 'Sinh hoạt', description: 'Việc nhà và những việc cần làm hằng ngày.', color: '#F59E0B' },
];

// Fictional but realistic student tasks; dates use Vietnam's UTC+07 explicitly.
const TASKS = [
  {
    title: 'Chốt phạm vi chức năng bài tập lớn Mobile', category: 'Dự án Mobile', priority: 'CAO', status: 'HOAN_THANH',
    start: '10 08:00', due: '10 11:00', completed: '10 10:30',
    description: 'Liệt kê chức năng chính: đăng nhập, quản lý công việc, danh mục, lịch, nhắc việc và công việc nhóm. Ghi lại những phần cần demo khi bảo vệ.',
  },
  {
    title: 'Vẽ sơ đồ cơ sở dữ liệu cho ứng dụng To-Do', category: 'Học tập', priority: 'CAO', status: 'HOAN_THANH',
    start: '10 14:00', due: '10 22:00', completed: '10 21:15',
    description: 'Rà soát quan hệ giữa người dùng, công việc, danh mục và nhắc nhở. Xuất sơ đồ rõ tên bảng và khóa ngoại để đưa vào báo cáo.',
  },
  {
    title: 'Cài bản APK kiểm thử lên điện thoại', category: 'Dự án Mobile', priority: 'TRUNG_BINH', status: 'HOAN_THANH',
    start: '11 08:30', due: '11 10:00', completed: '11 09:40',
    description: 'Kiểm tra kết nối cùng Wi-Fi, địa chỉ backend và quyền thông báo. Mở app, đăng nhập và thử tải danh sách công việc.',
  },
  {
    title: 'Kiểm tra đăng nhập và đăng xuất trên web', category: 'Dự án Mobile', priority: 'CAO', status: 'HOAN_THANH',
    start: '12 18:00', due: '12 20:00', completed: '12 19:30',
    description: 'Đăng nhập, chuyển tab Cá nhân, đăng xuất rồi tải lại trang. Kiểm tra phiên cũ không tự đăng nhập lại và trang quản trị yêu cầu đúng quyền.',
  },
  {
    title: 'Sắp xếp tài liệu học trong tuần', category: 'Học tập', priority: 'THAP', status: 'HOAN_THANH',
    start: '11 17:30', due: '11 19:00', completed: '11 18:20',
    description: 'Gom slide và bài thực hành theo từng môn. Đặt tên thư mục dễ tìm, ghi lại những nội dung cần hỏi trong buổi học tiếp theo.',
  },
  {
    title: 'Giặt quần áo và dọn bàn học', category: 'Sinh hoạt', priority: 'THAP', status: 'HOAN_THANH',
    start: '11 09:00', due: '11 12:00', completed: '11 10:40',
    description: 'Giặt quần áo, lau bàn và xếp lại dây sạc. Dọn chỗ ngồi gọn để buổi tối tập trung làm báo cáo.',
  },
  {
    title: 'Viết báo cáo phần giao diện ứng dụng', category: 'Dự án Mobile', priority: 'CAO', status: 'DANG_LAM',
    start: '12 08:00', due: '14 23:00',
    description: 'Mô tả luồng sử dụng Trang chủ, Công việc, Lịch và Cá nhân. Bổ sung ảnh chụp màn hình và giải thích lựa chọn giao diện cho từng chức năng.',
  },
  {
    title: 'Kiểm thử nhắc việc trên điện thoại Android', category: 'Dự án Mobile', priority: 'CAO', status: 'DANG_LAM',
    start: '12 09:00', due: '13 21:00',
    description: 'Thử thông báo sau 10 giây, tắt rồi bật lại thông báo và kiểm tra khi app chạy nền. Ghi kết quả từng trường hợp vào bảng kiểm thử.',
  },
  {
    title: 'Ôn SQL JOIN và truy vấn thống kê', category: 'Học tập', priority: 'TRUNG_BINH', status: 'DANG_LAM',
    start: '12 14:00', due: '15 20:00',
    description: 'Làm lại bài INNER JOIN, LEFT JOIN và GROUP BY. Tự viết truy vấn đếm công việc theo trạng thái và kiểm tra kết quả với dữ liệu mẫu.',
  },
  {
    title: 'Chuẩn bị slide thuyết trình bài tập lớn', category: 'Dự án Mobile', priority: 'CAO', status: 'DANG_LAM',
    start: '12 19:00', due: '18 22:00',
    description: 'Lên dàn ý 10–12 slide: bài toán, kiến trúc FE/BE, cơ sở dữ liệu, chức năng, demo và hướng phát triển. Ưu tiên hình minh họa và nội dung ngắn.',
  },
  {
    title: 'Lập kế hoạch chi tiêu tháng 10', category: 'Cá nhân', priority: 'TRUNG_BINH', status: 'DANG_LAM',
    start: '12 18:00', due: '16 20:00',
    description: 'Tổng hợp các khoản ăn uống, đi lại và đồ dùng học tập. Chia ngân sách cho phần còn lại của tháng, dành một khoản dự phòng nhỏ.',
  },
  {
    title: 'Hoàn thiện màn hình thùng rác và khôi phục', category: 'Dự án Mobile', priority: 'CAO', status: 'CHUA_LAM',
    start: '13 08:00', due: '14 22:00',
    description: 'Kiểm tra công việc sau khi xóa có xuất hiện trong thùng rác. Thử khôi phục, xác nhận xóa vĩnh viễn và giải thích thời gian lưu 30 ngày.',
  },
  {
    title: 'Test lọc công việc theo trạng thái và danh mục', category: 'Dự án Mobile', priority: 'TRUNG_BINH', status: 'CHUA_LAM',
    start: '14 09:00', due: '15 21:00',
    description: 'Đối chiếu kết quả lọc Chưa làm, Đang làm, Hoàn thành và Quá hạn. Kết hợp tìm kiếm với từng danh mục để kiểm tra số lượng hiển thị.',
  },
  {
    title: 'Viết hướng dẫn chạy backend và ứng dụng', category: 'Dự án Mobile', priority: 'TRUNG_BINH', status: 'CHUA_LAM',
    start: '15 08:00', due: '17 23:00',
    description: 'Ghi bước bật MySQL, chạy migration, khởi động backend và web. Thêm cách sửa IP khi dùng điện thoại và lưu ý phải build lại APK nếu đổi địa chỉ API.',
  },
  {
    title: 'Quay video demo ứng dụng trên điện thoại', category: 'Dự án Mobile', priority: 'CAO', status: 'CHUA_LAM',
    start: '18 09:00', due: '20 20:00',
    description: 'Chuẩn bị kịch bản demo khoảng 3–5 phút: tạo công việc, đánh dấu hoàn thành, nhắc việc, xem lịch và khôi phục từ thùng rác. Kiểm tra âm thanh trước khi quay.',
  },
  {
    title: 'Rà soát báo cáo và tài liệu nộp bài', category: 'Học tập', priority: 'CAO', status: 'CHUA_LAM',
    start: '21 09:00', due: '24 21:00',
    description: 'Kiểm tra mục lục, hình ảnh, lỗi chính tả và tên chức năng trong báo cáo. Chạy lại hướng dẫn cài đặt trên một phiên terminal mới để tránh thiếu bước.',
  },
  {
    title: 'Nộp bản bài tập lớn và mã nguồn', category: 'Học tập', priority: 'CAO', status: 'CHUA_LAM',
    start: '25 08:00', due: '25 18:00',
    description: 'Chuẩn bị báo cáo PDF, slide, đường dẫn repository và bản APK demo. Kiểm tra đủ tệp, không đính kèm .env hay mật khẩu trong gói nộp.',
  },
  {
    title: 'Mua vở ghi và bút cho tuần mới', category: 'Sinh hoạt', priority: 'THAP', status: 'CHUA_LAM',
    start: '13 10:00', due: '13 19:00',
    description: 'Kiểm tra đồ dùng còn thiếu trước khi mua. Mua một quyển vở ghi và bút, tránh mua trùng những món đã có.',
  },
  {
    title: 'Đi bộ 30 phút sau giờ học', category: 'Cá nhân', priority: 'THAP', status: 'CHUA_LAM',
    start: '14 17:00', due: '14 19:00',
    description: 'Đi bộ nhẹ sau một ngày ngồi học và lập trình. Mang nước, nghỉ mắt khỏi màn hình và cố gắng đi đủ 30 phút.',
  },
  {
    title: 'Hoàn thành bài luyện tập cấu trúc dữ liệu', category: 'Học tập', priority: 'TRUNG_BINH', status: 'QUA_HAN',
    start: '10 14:00', due: '11 22:00',
    description: 'Làm các bài về mảng, danh sách liên kết và ngăn xếp. Phần ngăn xếp còn chưa xong; cần dành một buổi làm nốt và ghi lại cách xử lý lỗi.',
  },
];

function date(value) {
  const [day, time] = value.split(' ');
  return new Date(`2026-10-${day}T${time}:00+07:00`);
}

function identity(task) {
  const due = task.due ? date(task.due) : new Date(task.han_hoan_thanh);
  return `${task.title || task.tieu_de}\n${due.toISOString()}`;
}

function validateFixture() {
  assert.equal(TASKS.length, 20, 'Import must contain exactly 20 tasks.');
  assert.equal(new Set(TASKS.map(identity)).size, TASKS.length);
  const demoEnd = new Date('2026-10-12T23:59:59+07:00');
  for (const task of TASKS) {
    assert(task.title.trim() && task.title.length <= 200);
    assert(CATEGORIES.some(category => category.name === task.category));
    assert(['THAP', 'TRUNG_BINH', 'CAO'].includes(task.priority));
    assert(['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'].includes(task.status));
    assert(CREATED_AT <= date(task.start) && date(task.start) <= date(task.due));
    assert.equal(Boolean(task.completed), task.status === 'HOAN_THANH');
    if (task.completed) assert(date(task.start) <= date(task.completed) && date(task.completed) <= demoEnd);
    if (task.status === 'QUA_HAN') assert(date(task.due) < demoEnd);
  }
}

function countStatuses(tasks) {
  return tasks.reduce((result, task) => {
    const status = task.trang_thai || task.status;
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
}

async function main() {
  const [flag, email, ...options] = process.argv.slice(2);
  if (flag !== '--email' || typeof email !== 'string' || email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    options.some(option => option !== '--apply') || options.length > 1) {
    throw new Error('Usage: node scripts/seed-realistic-personal-tasks.js --email EMAIL [--apply]');
  }
  validateFixture();
  const apply = options.includes('--apply');
  await sequelize.authenticate();
  const result = await sequelize.transaction(async transaction => {
    // This row lock serializes concurrent runs for the same account.
    const users = await NguoiDung.findAll({
      where: { email }, attributes: ['id', 'email', 'ten_dang_nhap', 'trang_thai'],
      transaction, lock: transaction.LOCK.UPDATE,
    });
    assert.equal(users.length, 1, 'Refusing import: email must resolve exactly one account.');
    const user = users[0];
    assert.equal(user.email, email, 'Refusing import: email must match exactly.');
    assert(user.trang_thai, 'Refusing import: account must be active.');
    const before = await CongViec.findAll({ order: [['id', 'ASC']], raw: true, transaction });
    const ownBefore = before.filter(task => task.nguoi_dung_id === user.id);
    const ownIdentities = new Set(ownBefore.filter(task => task.han_hoan_thanh).map(identity));
    const missing = TASKS.filter(task => !ownIdentities.has(identity(task)));
    const categoryRows = await DanhMuc.findAll({ where: { nguoi_dung_id: user.id }, raw: true, transaction });
    const categories = new Map(categoryRows.map(category => [category.ten_danh_muc, category.id]));
    const originalCategories = await DanhMuc.findAll({ order: [['id', 'ASC']], raw: true, transaction });
    let createdCategories = 0;

    if (apply && missing.length) {
      for (const category of CATEGORIES) {
        if (missing.some(task => task.category === category.name) && !categories.has(category.name)) {
          const row = await DanhMuc.create({
            nguoi_dung_id: user.id, ten_danh_muc: category.name,
            mo_ta: category.description, mau_sac: category.color,
          }, { transaction });
          categories.set(category.name, row.id);
          createdCategories += 1;
        }
      }
      const newRows = missing.map(task => ({
        nguoi_dung_id: user.id, danh_muc_id: categories.get(task.category),
        tieu_de: task.title, mo_ta: task.description, muc_do_uu_tien: task.priority,
        trang_thai: task.status, ngay_bat_dau: date(task.start), han_hoan_thanh: date(task.due),
        ngay_hoan_thanh: task.completed ? date(task.completed) : null,
        ngay_tao: CREATED_AT,
        ngay_cap_nhat: task.completed ? date(task.completed)
          : task.status === 'DANG_LAM' ? date(task.start)
            : task.status === 'QUA_HAN' ? date('12 08:00') : CREATED_AT,
        file_dinh_kem: null, lap_lai: 'KHONG', da_tao_lan_tiep: false, ngay_xoa: null,
      }));
      await CongViec.bulkCreate(newRows, { transaction, validate: true });
    }

    const after = await CongViec.findAll({ order: [['id', 'ASC']], raw: true, transaction });
    const afterById = new Map(after.map(task => [task.id, task]));
    // Existing tasks, including other accounts' rows, must remain byte-for-byte unchanged.
    for (const original of before) assert.deepEqual(afterById.get(original.id), original);
    const additions = after.filter(task => !before.some(original => original.id === task.id));
    assert.equal(additions.length, apply ? missing.length : 0);
    assert(additions.every(task => task.nguoi_dung_id === user.id && task.ngay_xoa === null));
    const afterCategories = await DanhMuc.findAll({ order: [['id', 'ASC']], raw: true, transaction });
    const afterCategoriesById = new Map(afterCategories.map(category => [category.id, category]));
    for (const original of originalCategories) assert.deepEqual(afterCategoriesById.get(original.id), original);
    const categoryAdditions = afterCategories.filter(category => !originalCategories.some(original => original.id === category.id));
    assert.equal(categoryAdditions.length, createdCategories);
    assert(categoryAdditions.every(category => category.nguoi_dung_id === user.id));
    const fixtureIdentities = new Set(TASKS.map(identity));
    const sampleRows = after.filter(task => task.nguoi_dung_id === user.id && task.han_hoan_thanh && fixtureIdentities.has(identity(task)));
    if (apply) assert.equal(sampleRows.length, 20);
    return {
      mode: apply ? 'apply' : 'preview', userId: user.id, email: user.email,
      existingTaskCount: ownBefore.length, addedTasks: additions.length, missingTasks: missing.length,
      skippedExistingSamples: 20 - missing.length, addedCategories: createdCategories,
      accountTaskCount: after.filter(task => task.nguoi_dung_id === user.id).length,
      sampleStatusCounts: countStatuses(apply ? sampleRows : TASKS),
      existingTasksUnchanged: true, existingCategoriesUnchanged: true, otherAccountsUnchanged: true,
      samples: (apply ? sampleRows : TASKS).map(task => ({
        id: task.id, title: task.tieu_de || task.title, status: task.trang_thai || task.status,
        due: task.han_hoan_thanh || date(task.due),
      })),
    };
  });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { TASKS, CATEGORIES, validateFixture };
