const { Router } = require('express');
const { sequelize, Nhom, ThanhVienNhom, NguoiDung, CongViecNhom, ThongBao, BinhLuanNhom, NhatKyNhom } = require('../models');
const { requireAuth } = require('../middleware/auth');
const router = Router();

// Helper: format member
function formatMember(member) {
  return {
    id: member.id,
    nhomId: member.nhom_id,
    nguoiDungId: member.nguoi_dung_id,
    vaiTro: member.vai_tro,
    ngayThamGia: member.ngay_tham_gia,
    nguoiDung: member.nguoiDung ? {
      id: member.nguoiDung.id,
      tenDangNhap: member.nguoiDung.ten_dang_nhap,
      email: member.nguoiDung.email,
      hoTen: member.nguoiDung.ho_ten,
    } : null,
  };
}

// Helper: format group
function formatGroup(nhom, members) {
  return {
    id: nhom.id,
    tenNhom: nhom.ten_nhom,
    moTa: nhom.mo_ta,
    truongNhomId: nhom.truong_nhom_id,
    ngayTao: nhom.ngay_tao,
    truongNhom: nhom.truongNhom ? {
      id: nhom.truongNhom.id,
      tenDangNhap: nhom.truongNhom.ten_dang_nhap,
      hoTen: nhom.truongNhom.ho_ten,
      email: nhom.truongNhom.email,
    } : null,
    thanhViens: members ? members.map(formatMember) : [],
  };
}

// Helper: format group task
function formatGroupTask(task) {
  return {
    id: task.id,
    nhomId: task.nhom_id,
    nguoiGiaoId: task.nguoi_giao_id,
    nguoiNhanId: task.nguoi_nhan_id,
    tieuDe: task.tieu_de,
    moTa: task.mo_ta,
    mucDoUuTien: task.muc_do_uu_tien,
    trangThai: task.trang_thai,
    hanHoanThanh: task.han_hoan_thanh,
    ngayTao: task.ngay_tao,
    ngayCapNhat: task.ngay_cap_nhat,
    fileDinhKem: task.file_dinh_kem ? JSON.parse(task.file_dinh_kem) : [],
    nguoiGiao: task.nguoiGiao ? {
      id: task.nguoiGiao.id,
      tenDangNhap: task.nguoiGiao.ten_dang_nhap,
      hoTen: task.nguoiGiao.ho_ten,
    } : null,
    nguoiNhan: task.nguoiNhan ? {
      id: task.nguoiNhan.id,
      tenDangNhap: task.nguoiNhan.ten_dang_nhap,
      hoTen: task.nguoiNhan.ho_ten,
    } : null,
  };
}

const USER_FIELDS = ['id', 'ten_dang_nhap', 'ho_ten', 'email'];
const ownerInclude = [{ model: NguoiDung, as: 'truongNhom', attributes: USER_FIELDS }];
const memberInclude = [{ model: NguoiDung, as: 'nguoiDung', attributes: USER_FIELDS }];
const taskInclude = ['nguoiGiao', 'nguoiNhan'].map(as => ({ model: NguoiDung, as, attributes: USER_FIELDS }));
const priorities = ['THAP', 'TRUNG_BINH', 'CAO'];
const statuses = ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'];
async function logActivity(teamId, userId, taskId, action, content, transaction) {
  await NhatKyNhom.create({ nhom_id: teamId, nguoi_dung_id: userId,
    cong_viec_nhom_id: taskId || null, hanh_dong: action, noi_dung: content, ngay_tao: new Date() }, { transaction });
}
async function notifyTeamUser(team, userId, taskId, type, title, content, transaction) {
  if (!userId) return;
  await ThongBao.create({ nguoi_dung_id: userId, nhom_id: team.id,
    cong_viec_nhom_id: taskId || null, cong_viec_id: null, loai: type,
    tieu_de: title, noi_dung: content, da_doc: false, ngay_tao: new Date() }, { transaction });
}
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function id(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    fail(400, 'ID phải là số nguyên dương hợp lệ.');
  }
  return Number(value);
}
function text(value, name, max, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    fail(400, `${name} không hợp lệ (tối đa ${max} ký tự).`);
  }
  return value.trim() || null;
}
function endpoint(handler) {
  return async (req, res, next) => {
    try { await handler(req, res); }
    catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'Thành viên đã có trong nhóm.' });
      next(error);
    }
  };
}
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.body == null || Array.isArray(req.body) || typeof req.body !== 'object') {
    return res.status(400).json({ message: 'Body phải là một JSON object.' });
  }
  // Legacy clients may still send userId, but cannot use it to impersonate others.
  const claimed = [req.body.userId, req.query.userId].filter(value => value !== undefined);
  if (claimed.some(value => String(value) !== String(req.auth.userId))) {
    return res.status(403).json({ message: 'userId không khớp tài khoản đăng nhập.' });
  }
  next();
});

// All group mutations serialize on the group row. Membership/ownership checks
// and writes share the transaction, including transfers, removals and assignments.
async function inTeam(req, action, ownerOnly = false) {
  const teamId = id(req.params.teamId);
  return sequelize.transaction(async transaction => {
    const team = await Nhom.findByPk(teamId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!team) fail(404, 'Không tìm thấy nhóm.');
    const member = await ThanhVienNhom.findOne({ where: { nhom_id: teamId, nguoi_dung_id: req.auth.userId }, transaction });
    if (!member) fail(403, 'Bạn không phải thành viên nhóm này.');
    if (ownerOnly && team.truong_nhom_id !== req.auth.userId) fail(403, 'Chỉ trưởng nhóm có quyền thực hiện thao tác này.');
    return action(team, transaction);
  });
}
async function members(teamId, transaction) {
  return ThanhVienNhom.findAll({ where: { nhom_id: teamId }, include: memberInclude, order: [['id', 'ASC']], transaction });
}
async function activeMember(teamId, userId, transaction) {
  const membership = await ThanhVienNhom.findOne({ where: { nhom_id: teamId, nguoi_dung_id: userId }, transaction });
  const user = membership && await NguoiDung.findByPk(userId, { transaction });
  if (!membership || !user?.trang_thai) fail(400, 'Người nhận phải là thành viên đang hoạt động của nhóm.');
}
async function taskInTeam(req, team, transaction) {
  const task = await CongViecNhom.findOne({ where: { id: id(req.params.taskId), nhom_id: team.id }, transaction });
  if (!task) fail(404, 'Không tìm thấy công việc trong nhóm.');
  return task;
}
function taskValues(body, partial = false) {
  const values = {};
  if (!partial || body.tieuDe !== undefined) values.tieu_de = text(body.tieuDe, 'Tiêu đề', 200, true);
  if (!partial || body.moTa !== undefined) values.mo_ta = text(body.moTa, 'Mô tả', 10000);
  if (!partial || body.mucDoUuTien !== undefined) {
    const priority = body.mucDoUuTien === undefined ? 'TRUNG_BINH' : body.mucDoUuTien;
    if (!priorities.includes(priority)) fail(400, 'Mức độ ưu tiên không hợp lệ.');
    values.muc_do_uu_tien = priority;
  }
  if (!partial || body.hanHoanThanh !== undefined) {
    const due = body.hanHoanThanh;
    if (due != null && (typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(due) || !Number.isFinite(Date.parse(due)))) {
      fail(400, 'Hạn hoàn thành phải là ngày giờ ISO hợp lệ hoặc null.');
    }
    values.han_hoan_thanh = due == null ? null : new Date(due);
  }
  if (!partial || body.nguoiNhanId !== undefined) values.nguoi_nhan_id = body.nguoiNhanId == null ? null : id(body.nguoiNhanId);
  if (!partial || body.fileDinhKem !== undefined) {
    const files = body.fileDinhKem ?? [];
    if (!Array.isArray(files) || files.length > 10 || files.some(file =>
      !file || typeof file !== 'object' || Array.isArray(file) ||
      typeof file.url !== 'string' || file.url.length > 2048 ||
      !(/^(https?:\/\/|\/uploads\/)/.test(file.url)) ||
      typeof file.filename !== 'string' || file.filename.length > 255 ||
      typeof file.mimetype !== 'string' || file.mimetype.length > 100 ||
      !Number.isSafeInteger(file.size) || file.size < 0)) fail(400, 'Danh sách tệp đính kèm không hợp lệ.');
    values.file_dinh_kem = JSON.stringify(files);
  }
  return values;
}

router.get('/', endpoint(async (req, res) => {
  const memberships = await ThanhVienNhom.findAll({
    where: { nguoi_dung_id: req.auth.userId },
    include: [{ model: Nhom, as: 'nhom', include: ownerInclude }], order: [['id', 'DESC']],
  });
  res.json(memberships.filter(m => m.nhom).map(m => formatGroup(m.nhom, [])));
}));

router.post('/', endpoint(async (req, res) => {
  const name = text(req.body.tenNhom, 'Tên nhóm', 100, true);
  const description = text(req.body.moTa, 'Mô tả', 10000);
  const result = await sequelize.transaction(async transaction => {
    const team = await Nhom.create({ ten_nhom: name, mo_ta: description, truong_nhom_id: req.auth.userId, ngay_tao: new Date() }, { transaction });
    await ThanhVienNhom.create({ nhom_id: team.id, nguoi_dung_id: req.auth.userId, vai_tro: 'TRUONG_NHOM', ngay_tham_gia: new Date() }, { transaction });
    await team.reload({ include: ownerInclude, transaction });
    return formatGroup(team, await members(team.id, transaction));
  });
  res.status(201).location(`/api/teams/${result.id}`).json(result);
}));

router.get('/:teamId', endpoint(async (req, res) => {
  const result = await inTeam(req, async (team, transaction) => {
    await team.reload({ include: ownerInclude, transaction });
    return formatGroup(team, await members(team.id, transaction));
  });
  res.json(result);
}));

router.put('/:teamId', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    await team.update({ ten_nhom: text(req.body.tenNhom, 'Tên nhóm', 100, true), mo_ta: text(req.body.moTa, 'Mô tả', 10000) }, { transaction });
  }, true);
  res.status(204).end();
}));

router.delete('/:teamId', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    // Explicit deletion also supports databases created with older FK defaults.
    await CongViecNhom.destroy({ where: { nhom_id: team.id }, transaction });
    await ThanhVienNhom.destroy({ where: { nhom_id: team.id }, transaction });
    await team.destroy({ transaction });
  }, true);
  res.status(204).end();
}));

// Existing /invite contract adds a registered account immediately; no email is sent.
router.post('/:teamId/invite', endpoint(async (req, res) => {
  const result = await inTeam(req, async (team, transaction) => {
    const email = text(req.body.inviteEmail, 'Email', 100, true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Email không hợp lệ.');
    const user = await NguoiDung.findOne({ where: { email, trang_thai: true }, transaction });
    if (!user) fail(404, 'Không tìm thấy tài khoản đang hoạt động với email này.');
    const existing = await ThanhVienNhom.findOne({ where: { nhom_id: team.id, nguoi_dung_id: user.id }, transaction });
    if (existing) fail(409, 'Người dùng đã là thành viên nhóm.');
    const member = await ThanhVienNhom.create({ nhom_id: team.id, nguoi_dung_id: user.id, vai_tro: 'THANH_VIEN', ngay_tham_gia: new Date() }, { transaction });
    await member.reload({ include: memberInclude, transaction });
    await notifyTeamUser(team, user.id, null, 'THANH_VIEN_NHOM', 'Bạn đã được thêm vào nhóm',
      `Bạn đã trở thành thành viên của nhóm “${team.ten_nhom}”.`, transaction);
    return formatMember(member);
  }, true);
  res.status(201).json(result);
}));

router.post('/:teamId/transfer-leader', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    const newId = id(req.body.newLeaderId);
    if (newId === req.auth.userId) fail(400, 'Không thể chuyển quyền cho chính mình.');
    await activeMember(team.id, newId, transaction);
    await ThanhVienNhom.update({ vai_tro: 'THANH_VIEN' }, { where: { nhom_id: team.id, nguoi_dung_id: req.auth.userId }, transaction });
    await ThanhVienNhom.update({ vai_tro: 'TRUONG_NHOM' }, { where: { nhom_id: team.id, nguoi_dung_id: newId }, transaction });
    await team.update({ truong_nhom_id: newId }, { transaction });
    await notifyTeamUser(team, newId, null, 'TRUONG_NHOM', 'Bạn trở thành trưởng nhóm',
      `Bạn được trao quyền quản lý nhóm “${team.ten_nhom}”.`, transaction);
  }, true);
  res.json({ message: 'Chuyển trưởng nhóm thành công.' });
}));

async function removeMember(team, userId, transaction) {
  if (team.truong_nhom_id === userId) fail(400, 'Hãy chuyển quyền trưởng nhóm trước.');
  const member = await ThanhVienNhom.findOne({ where: { nhom_id: team.id, nguoi_dung_id: userId }, transaction });
  if (!member) fail(404, 'Thành viên không tồn tại.');
  await CongViecNhom.update({ nguoi_nhan_id: null, ngay_cap_nhat: new Date() }, { where: { nhom_id: team.id, nguoi_nhan_id: userId }, transaction });
  await member.destroy({ transaction });
}
router.delete('/:teamId/members/:memberId', endpoint(async (req, res) => {
  await inTeam(req, (team, transaction) => removeMember(team, id(req.params.memberId), transaction), true);
  res.status(204).end();
}));
router.delete('/:teamId/leave', endpoint(async (req, res) => {
  await inTeam(req, (team, transaction) => removeMember(team, req.auth.userId, transaction));
  res.status(204).end();
}));

router.get('/:teamId/tasks', endpoint(async (req, res) => {
  const result = await inTeam(req, async (team, transaction) => {
    const tasks = await CongViecNhom.findAll({ where: { nhom_id: team.id }, include: taskInclude, order: [['ngay_tao', 'DESC'], ['id', 'DESC']], transaction });
    return tasks.map(formatGroupTask);
  });
  res.json(result);
}));
router.get('/:teamId/activity', endpoint(async (req, res) => {
  const result = await inTeam(req, async (team, transaction) => {
    const entries = await NhatKyNhom.findAll({ where: { nhom_id: team.id },
      include: [
        { model: NguoiDung, as: 'nguoiThucHien', attributes: USER_FIELDS },
        { model: CongViecNhom, as: 'congViecNhom', attributes: ['id', 'tieu_de'] },
      ], order: [['ngay_tao', 'DESC'], ['id', 'DESC']], limit: 200, transaction });
    return entries.map(entry => ({ id: entry.id, hanhDong: entry.hanh_dong,
      noiDung: entry.noi_dung, ngayTao: entry.ngay_tao, congViecNhomId: entry.cong_viec_nhom_id,
      nguoiThucHien: entry.nguoiThucHien ? { id: entry.nguoiThucHien.id,
        hoTen: entry.nguoiThucHien.ho_ten, tenDangNhap: entry.nguoiThucHien.ten_dang_nhap } : null,
      congViec: entry.congViecNhom ? { id: entry.congViecNhom.id, tieuDe: entry.congViecNhom.tieu_de } : null }));
  });
  res.json(result);
}));
router.post('/:teamId/tasks', endpoint(async (req, res) => {
  const result = await inTeam(req, async (team, transaction) => {
    const values = taskValues(req.body);
    if (values.nguoi_nhan_id != null) await activeMember(team.id, values.nguoi_nhan_id, transaction);
    const task = await CongViecNhom.create({ ...values, nhom_id: team.id, nguoi_giao_id: req.auth.userId, trang_thai: 'CHUA_LAM', ngay_tao: new Date(), ngay_cap_nhat: new Date() }, { transaction });
    await task.reload({ include: taskInclude, transaction });
    await logActivity(team.id, req.auth.userId, task.id, 'TAO_CONG_VIEC', `Đã tạo công việc “${task.tieu_de}”.`, transaction);

    // Tự động tạo thông báo khi có việc mới được giao
    const notifyUserIds = [];
    if (values.nguoi_nhan_id) {
      if (values.nguoi_nhan_id !== req.auth.userId) {
        notifyUserIds.push(values.nguoi_nhan_id);
      }
    } else {
      const allMembers = await ThanhVienNhom.findAll({ where: { nhom_id: team.id }, transaction });
      for (const m of allMembers) {
        if (m.nguoi_dung_id !== req.auth.userId) {
          notifyUserIds.push(m.nguoi_dung_id);
        }
      }
    }

    const notifTitle = values.nguoi_nhan_id
      ? `Bạn được giao công việc mới trong nhóm "${team.ten_nhom}"`
      : `Công việc chung mới trong nhóm "${team.ten_nhom}"`;
    const notifContent = `Công việc: "${task.tieu_de}"`;

    for (const uid of notifyUserIds) {
      await ThongBao.create({
        nguoi_dung_id: uid,
        cong_viec_id: null,
        tieu_de: notifTitle,
        noi_dung: notifContent,
        da_doc: false,
        ngay_tao: new Date(),
        nhom_id: team.id,
        cong_viec_nhom_id: task.id,
        loai: 'GIAO_VIEC_NHOM',
      }, { transaction });
    }

    return formatGroupTask(task);
  }, true);
  res.status(201).json(result);
}));
router.put('/:teamId/tasks/:taskId', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    const task = await taskInTeam(req, team, transaction);
    const values = taskValues(req.body, true);
    if (!Object.keys(values).length) fail(400, 'Không có trường công việc để cập nhật.');
    if (values.nguoi_nhan_id != null) await activeMember(team.id, values.nguoi_nhan_id, transaction);
    const assigneeChanged = values.nguoi_nhan_id !== undefined && values.nguoi_nhan_id !== task.nguoi_nhan_id;
    const previousAssignee = task.nguoi_nhan_id;
    const dueChanged = values.han_hoan_thanh !== undefined &&
      Number(values.han_hoan_thanh) !== Number(task.han_hoan_thanh);
    await task.update({ ...values, ngay_cap_nhat: new Date() }, { transaction });
    await logActivity(team.id, req.auth.userId, task.id, assigneeChanged ? 'GIAO_CONG_VIEC' : 'CAP_NHAT_CONG_VIEC',
      assigneeChanged ? `Đã thay đổi người nhận công việc “${task.tieu_de}”.` : `Đã cập nhật công việc “${task.tieu_de}”.`, transaction);
    if (assigneeChanged) {
      if (task.nguoi_nhan_id !== req.auth.userId) await notifyTeamUser(team, task.nguoi_nhan_id, task.id,
        'GIAO_VIEC_NHOM', 'Bạn được giao công việc', `“${task.tieu_de}” trong nhóm “${team.ten_nhom}”.`, transaction);
      if (previousAssignee !== req.auth.userId) await notifyTeamUser(team, previousAssignee, task.id,
        'DOI_NGUOI_NHAN', 'Công việc đã đổi người nhận', `Bạn không còn được giao công việc “${task.tieu_de}”.`, transaction);
    }
    if (dueChanged && task.nguoi_nhan_id !== req.auth.userId) await notifyTeamUser(team, task.nguoi_nhan_id, task.id,
      'DOI_HAN_NHOM', 'Hạn hoàn thành đã thay đổi', `“${task.tieu_de}”: ${task.han_hoan_thanh
        ? new Date(task.han_hoan_thanh).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Đã bỏ hạn hoàn thành'}.`, transaction);
  }, true);
  res.status(204).end();
}));
router.patch('/:teamId/tasks/:taskId/status', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    const task = await taskInTeam(req, team, transaction);
    if (team.truong_nhom_id !== req.auth.userId && task.nguoi_nhan_id !== req.auth.userId) fail(403, 'Chỉ trưởng nhóm hoặc người được giao việc được cập nhật trạng thái.');
    if (!statuses.includes(req.body.trangThai)) fail(400, 'Trạng thái không hợp lệ.');
    if (task.trang_thai === req.body.trangThai) return;
    await task.update({ trang_thai: req.body.trangThai, ngay_cap_nhat: new Date() }, { transaction });
    await logActivity(team.id, req.auth.userId, task.id,
      req.body.trangThai === 'HOAN_THANH' ? 'HOAN_THANH' : 'CAP_NHAT_TRANG_THAI',
      req.body.trangThai === 'HOAN_THANH' ? `Đã hoàn thành công việc “${task.tieu_de}”.` : `Đã đổi trạng thái công việc “${task.tieu_de}”.`, transaction);

    // Tạo thông báo khi công việc nhóm hoàn thành
    if (req.body.trangThai !== 'HOAN_THANH') {
      const labels = { CHUA_LAM: 'Chưa làm', DANG_LAM: 'Đang làm', QUA_HAN: 'Quá hạn' };
      const recipientId = req.auth.userId === team.truong_nhom_id ? task.nguoi_nhan_id : team.truong_nhom_id;
      if (recipientId !== req.auth.userId) await notifyTeamUser(team, recipientId, task.id, 'TRANG_THAI_NHOM',
        `Công việc: ${labels[req.body.trangThai]}`, `“${task.tieu_de}” trong nhóm “${team.ten_nhom}” đã đổi trạng thái.`, transaction);
    }
    if (req.body.trangThai === 'HOAN_THANH') {
      const recipientId = req.auth.userId === team.truong_nhom_id
        ? (task.nguoi_nhan_id && task.nguoi_nhan_id !== team.truong_nhom_id ? task.nguoi_nhan_id : null)
        : team.truong_nhom_id;
      if (recipientId) {
        await ThongBao.create({
          nguoi_dung_id: recipientId,
          cong_viec_id: null,
          tieu_de: `Công việc đã hoàn thành: "${task.tieu_de}"`,
          noi_dung: `Công việc trong nhóm "${team.ten_nhom}" đã được đánh dấu hoàn thành.`,
          da_doc: false,
          ngay_tao: new Date(),
          nhom_id: team.id,
          cong_viec_nhom_id: task.id,
          loai: 'TRANG_THAI_NHOM',
        }, { transaction });
      }
    }
  });
  res.status(204).end();
}));
router.delete('/:teamId/tasks/:taskId', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    const task = await taskInTeam(req, team, transaction);
    await task.destroy({ transaction });
  }, true);
  res.status(204).end();
}));
const formatComment = comment => ({
  id: comment.id, nguoiDungId: comment.nguoi_dung_id,
  noiDung: comment.noi_dung, ngayTao: comment.ngay_tao,
  tacGia: comment.tacGia ? { hoTen: comment.tacGia.ho_ten, tenDangNhap: comment.tacGia.ten_dang_nhap } : null,
});
router.get('/:teamId/tasks/:taskId/comments', endpoint(async (req, res) => {
  const result = await inTeam(req, async (team, transaction) => {
    const task = await taskInTeam(req, team, transaction);
    const comments = await BinhLuanNhom.findAll({ where: { cong_viec_nhom_id: task.id },
      include: [{ model: NguoiDung, as: 'tacGia', attributes: ['ho_ten', 'ten_dang_nhap'] }],
      order: [['id', 'ASC']], transaction });
    return comments.map(formatComment);
  });
  res.json(result);
}));
router.post('/:teamId/tasks/:taskId/comments', endpoint(async (req, res) => {
  const content = text(req.body.noiDung, 'Bình luận', 2000, true);
  const result = await inTeam(req, async (team, transaction) => {
    const task = await taskInTeam(req, team, transaction);
    const comment = await BinhLuanNhom.create({ cong_viec_nhom_id: task.id,
      nguoi_dung_id: req.auth.userId, noi_dung: content, ngay_tao: new Date() }, { transaction });
    await comment.reload({ include: [{ model: NguoiDung, as: 'tacGia', attributes: ['ho_ten', 'ten_dang_nhap'] }], transaction });
    const allMembers = await ThanhVienNhom.findAll({ where: { nhom_id: team.id }, transaction });
    const author = comment.tacGia?.ho_ten || comment.tacGia?.ten_dang_nhap || 'Một thành viên';
    for (const member of allMembers) {
      if (member.nguoi_dung_id === req.auth.userId) continue;
      await ThongBao.create({ nguoi_dung_id: member.nguoi_dung_id, cong_viec_id: null,
        nhom_id: team.id, cong_viec_nhom_id: task.id, loai: 'BINH_LUAN_NHOM',
        tieu_de: `Bình luận mới trong “${team.ten_nhom}”`,
        noi_dung: `${author}: ${content}`, da_doc: false, ngay_tao: new Date() }, { transaction });
    }
    await logActivity(team.id, req.auth.userId, task.id, 'BINH_LUAN', `Đã bình luận trong công việc “${task.tieu_de}”.`, transaction);
    return formatComment(comment);
  });
  res.status(201).json(result);
}));
router.delete('/:teamId/tasks/:taskId/comments/:commentId', endpoint(async (req, res) => {
  await inTeam(req, async (team, transaction) => {
    const task = await taskInTeam(req, team, transaction);
    const comment = await BinhLuanNhom.findOne({ where: { id: id(req.params.commentId), cong_viec_nhom_id: task.id }, transaction });
    if (!comment) fail(404, 'Không tìm thấy bình luận.');
    if (comment.nguoi_dung_id !== req.auth.userId && team.truong_nhom_id !== req.auth.userId) fail(403, 'Chỉ tác giả hoặc trưởng nhóm được xóa bình luận.');
    await comment.destroy({ transaction });
  });
  res.status(204).end();
}));
module.exports = router;
