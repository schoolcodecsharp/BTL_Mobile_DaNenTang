const { Router } = require('express');
const { Nhom, ThanhVienNhom, NguoiDung, CongViecNhom } = require('../models');
const { Op } = require('sequelize');

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

// GET /api/teams  – Danh sách nhóm của user (query: userId)
router.get('/', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    if (!userId) return res.status(400).json({ message: 'userId là bắt buộc.' });

    const memberships = await ThanhVienNhom.findAll({
      where: { nguoi_dung_id: userId },
      include: [{
        model: Nhom,
        as: 'nhom',
        include: [{ model: NguoiDung, as: 'truongNhom', attributes: ['id', 'ten_dang_nhap', 'ho_ten', 'email'] }],
      }],
    });

    const groups = memberships.map((m) => formatGroup(m.nhom, []));
    return res.json(groups);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/teams  – Tạo nhóm mới
router.post('/', async (req, res) => {
  try {
    const { tenNhom, moTa, userId } = req.body;
    const uid = parseInt(userId, 10);
    if (!tenNhom?.trim()) return res.status(400).json({ message: 'Tên nhóm là bắt buộc.' });
    if (!uid) return res.status(400).json({ message: 'userId là bắt buộc.' });

    const now = new Date();
    const nhom = await Nhom.create({
      ten_nhom: tenNhom.trim(),
      mo_ta: moTa?.trim() || null,
      truong_nhom_id: uid,
      ngay_tao: now,
    });

    // Tự động thêm người tạo là trưởng nhóm
    await ThanhVienNhom.create({
      nhom_id: nhom.id,
      nguoi_dung_id: uid,
      vai_tro: 'TRUONG_NHOM',
      ngay_tham_gia: now,
    });

    const created = await Nhom.findByPk(nhom.id, {
      include: [{ model: NguoiDung, as: 'truongNhom', attributes: ['id', 'ten_dang_nhap', 'ho_ten', 'email'] }],
    });
    return res.status(201).json(formatGroup(created, []));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/teams/:teamId  – Chi tiết nhóm + thành viên
router.get('/:teamId', async (req, res) => {
  try {
    const nhom = await Nhom.findByPk(req.params.teamId, {
      include: [{ model: NguoiDung, as: 'truongNhom', attributes: ['id', 'ten_dang_nhap', 'ho_ten', 'email'] }],
    });
    if (!nhom) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });

    const members = await ThanhVienNhom.findAll({
      where: { nhom_id: nhom.id },
      include: [{ model: NguoiDung, as: 'nguoiDung', attributes: ['id', 'ten_dang_nhap', 'ho_ten', 'email'] }],
    });

    return res.json(formatGroup(nhom, members));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/teams/:teamId/invite  – Mời thành viên (chỉ trưởng nhóm)
router.post('/:teamId/invite', async (req, res) => {
  try {
    const { userId, inviteEmail } = req.body;
    const uid = parseInt(userId, 10);

    const nhom = await Nhom.findByPk(req.params.teamId);
    if (!nhom) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });

    // Kiểm tra quyền trưởng nhóm
    const callerMembership = await ThanhVienNhom.findOne({
      where: { nhom_id: nhom.id, nguoi_dung_id: uid },
    });
    if (!callerMembership || callerMembership.vai_tro !== 'TRUONG_NHOM') {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có thể mời thành viên.' });
    }

    if (!inviteEmail?.trim()) return res.status(400).json({ message: 'Email người được mời là bắt buộc.' });

    const invitee = await NguoiDung.findOne({ where: { email: inviteEmail.trim() } });
    if (!invitee) return res.status(404).json({ message: 'Không tìm thấy người dùng với email này.' });

    // Kiểm tra đã là thành viên chưa
    const existing = await ThanhVienNhom.findOne({
      where: { nhom_id: nhom.id, nguoi_dung_id: invitee.id },
    });
    if (existing) return res.status(400).json({ message: 'Người dùng này đã là thành viên của nhóm.' });

    const member = await ThanhVienNhom.create({
      nhom_id: nhom.id,
      nguoi_dung_id: invitee.id,
      vai_tro: 'THANH_VIEN',
      ngay_tham_gia: new Date(),
    });

    const full = await ThanhVienNhom.findByPk(member.id, {
      include: [{ model: NguoiDung, as: 'nguoiDung', attributes: ['id', 'ten_dang_nhap', 'ho_ten', 'email'] }],
    });

    return res.status(201).json(formatMember(full));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/teams/:teamId/transfer-leader  – Chuyển trưởng nhóm
router.post('/:teamId/transfer-leader', async (req, res) => {
  try {
    const { userId, newLeaderId } = req.body;
    const uid = parseInt(userId, 10);
    const newId = parseInt(newLeaderId, 10);

    const nhom = await Nhom.findByPk(req.params.teamId);
    if (!nhom) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });

    // Kiểm tra quyền trưởng nhóm
    const callerMembership = await ThanhVienNhom.findOne({
      where: { nhom_id: nhom.id, nguoi_dung_id: uid },
    });
    if (!callerMembership || callerMembership.vai_tro !== 'TRUONG_NHOM') {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có thể chuyển quyền.' });
    }

    if (uid === newId) return res.status(400).json({ message: 'Không thể chuyển quyền cho chính mình.' });

    // Người nhận phải là thành viên của nhóm
    const newLeaderMembership = await ThanhVienNhom.findOne({
      where: { nhom_id: nhom.id, nguoi_dung_id: newId },
    });
    if (!newLeaderMembership) {
      return res.status(404).json({ message: 'Người được chuyển quyền không phải thành viên của nhóm.' });
    }

    // Thực hiện chuyển quyền
    callerMembership.vai_tro = 'THANH_VIEN';
    await callerMembership.save();

    newLeaderMembership.vai_tro = 'TRUONG_NHOM';
    await newLeaderMembership.save();

    nhom.truong_nhom_id = newId;
    await nhom.save();

    return res.json({ message: 'Chuyển trưởng nhóm thành công.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/teams/:teamId/members/:memberId  – Xóa thành viên (chỉ trưởng nhóm)
router.delete('/:teamId/members/:memberId', async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = parseInt(userId, 10);
    const memberId = parseInt(req.params.memberId, 10);

    const nhom = await Nhom.findByPk(req.params.teamId);
    if (!nhom) return res.status(404).json({ message: 'Không tìm thấy nhóm.' });

    const callerMembership = await ThanhVienNhom.findOne({
      where: { nhom_id: nhom.id, nguoi_dung_id: uid },
    });
    if (!callerMembership || callerMembership.vai_tro !== 'TRUONG_NHOM') {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có thể xóa thành viên.' });
    }

    const target = await ThanhVienNhom.findOne({
      where: { nhom_id: nhom.id, nguoi_dung_id: memberId },
    });
    if (!target) return res.status(404).json({ message: 'Thành viên không tồn tại.' });
    if (target.vai_tro === 'TRUONG_NHOM') {
      return res.status(400).json({ message: 'Không thể xóa trưởng nhóm.' });
    }

    await target.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/teams/:teamId/leave  – Rời nhóm (thành viên thường)
router.delete('/:teamId/leave', async (req, res) => {
  try {
    const { userId } = req.body;
    const uid = parseInt(userId, 10);

    const membership = await ThanhVienNhom.findOne({
      where: { nhom_id: req.params.teamId, nguoi_dung_id: uid },
    });
    if (!membership) return res.status(404).json({ message: 'Bạn không phải thành viên nhóm này.' });
    if (membership.vai_tro === 'TRUONG_NHOM') {
      return res.status(400).json({ message: 'Trưởng nhóm không thể rời nhóm. Hãy chuyển quyền trước.' });
    }

    await membership.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// ── Group Tasks ──────────────────────────────────────────────

// GET /api/teams/:teamId/tasks
router.get('/:teamId/tasks', async (req, res) => {
  try {
    const { userId } = req.query;
    const uid = parseInt(userId, 10);

    // Verify membership
    const membership = await ThanhVienNhom.findOne({
      where: { nhom_id: req.params.teamId, nguoi_dung_id: uid },
    });
    if (!membership) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm này.' });

    const tasks = await CongViecNhom.findAll({
      where: { nhom_id: req.params.teamId },
      include: [
        { model: NguoiDung, as: 'nguoiGiao', attributes: ['id', 'ten_dang_nhap', 'ho_ten'] },
        { model: NguoiDung, as: 'nguoiNhan', attributes: ['id', 'ten_dang_nhap', 'ho_ten'] },
      ],
      order: [['ngay_tao', 'DESC']],
    });

    return res.json(tasks.map(formatGroupTask));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/teams/:teamId/tasks  – Giao công việc (chỉ trưởng nhóm)
router.post('/:teamId/tasks', async (req, res) => {
  try {
    const { userId, tieuDe, moTa, mucDoUuTien, hanHoanThanh, nguoiNhanId, fileDinhKem } = req.body;
    const uid = parseInt(userId, 10);

    const membership = await ThanhVienNhom.findOne({
      where: { nhom_id: req.params.teamId, nguoi_dung_id: uid },
    });
    if (!membership || membership.vai_tro !== 'TRUONG_NHOM') {
      return res.status(403).json({ message: 'Chỉ trưởng nhóm mới có thể giao công việc.' });
    }

    if (!tieuDe?.trim()) return res.status(400).json({ message: 'Tiêu đề công việc là bắt buộc.' });

    const now = new Date();
    const task = await CongViecNhom.create({
      nhom_id: parseInt(req.params.teamId, 10),
      nguoi_giao_id: uid,
      nguoi_nhan_id: nguoiNhanId ? parseInt(nguoiNhanId, 10) : null,
      tieu_de: tieuDe.trim(),
      mo_ta: moTa?.trim() || null,
      muc_do_uu_tien: mucDoUuTien || 'TRUNG_BINH',
      trang_thai: 'CHUA_LAM',
      han_hoan_thanh: hanHoanThanh || null,
      ngay_tao: now,
      ngay_cap_nhat: now,
      file_dinh_kem: fileDinhKem ? JSON.stringify(fileDinhKem) : null,
    });

    const full = await CongViecNhom.findByPk(task.id, {
      include: [
        { model: NguoiDung, as: 'nguoiGiao', attributes: ['id', 'ten_dang_nhap', 'ho_ten'] },
        { model: NguoiDung, as: 'nguoiNhan', attributes: ['id', 'ten_dang_nhap', 'ho_ten'] },
      ],
    });

    return res.status(201).json(formatGroupTask(full));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PATCH /api/teams/:teamId/tasks/:taskId/status  – Cập nhật trạng thái
router.patch('/:teamId/tasks/:taskId/status', async (req, res) => {
  try {
    const { userId, trangThai } = req.body;
    const uid = parseInt(userId, 10);

    const membership = await ThanhVienNhom.findOne({
      where: { nhom_id: req.params.teamId, nguoi_dung_id: uid },
    });
    if (!membership) return res.status(403).json({ message: 'Bạn không phải thành viên nhóm này.' });

    const VALID = ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'];
    if (!VALID.includes(trangThai)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });

    const task = await CongViecNhom.findOne({
      where: { id: req.params.taskId, nhom_id: req.params.teamId },
    });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy công việc.' });

    task.trang_thai = trangThai;
    task.ngay_cap_nhat = new Date();
    await task.save();

    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
