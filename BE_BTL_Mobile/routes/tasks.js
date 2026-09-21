const { Router } = require('express');
const { CongViec, DanhMuc } = require('../models');

const router = Router({ mergeParams: true });

const VALID_PRIORITIES = ['THAP', 'TRUNG_BINH', 'CAO'];
const VALID_STATUSES = ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'];

function toResponse(task) {
  return {
    id: task.id,
    nguoiDungId: task.nguoi_dung_id,
    danhMucId: task.danh_muc_id,
    tieuDe: task.tieu_de,
    moTa: task.mo_ta,
    mucDoUuTien: task.muc_do_uu_tien,
    trangThai: task.trang_thai,
    ngayBatDau: task.ngay_bat_dau,
    hanHoanThanh: task.han_hoan_thanh,
    ngayHoanThanh: task.ngay_hoan_thanh,
    ngayTao: task.ngay_tao,
    ngayCapNhat: task.ngay_cap_nhat,
    fileDinhKem: task.file_dinh_kem ? JSON.parse(task.file_dinh_kem) : [],
    danhMuc: task.danhMuc ? {
      id: task.danhMuc.id,
      nguoiDungId: task.danhMuc.nguoi_dung_id,
      tenDanhMuc: task.danhMuc.ten_danh_muc,
      moTa: task.danhMuc.mo_ta,
      mauSac: task.danhMuc.mau_sac,
    } : null,
  };
}

// GET /api/users/:userId/tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await CongViec.findAll({
      where: { nguoi_dung_id: req.params.userId },
      include: [{ model: DanhMuc, as: 'danhMuc' }],
      order: [['han_hoan_thanh', 'ASC']],
    });
    return res.json(tasks.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/:userId/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await CongViec.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    return task ? res.json(toResponse(task)) : res.status(404).json();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/users/:userId/tasks
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, status, categoryId, startDate, dueDate, attachments } = req.body;
    const userId = parseInt(req.params.userId, 10);

    if (!title?.trim()) return res.status(400).json({ errors: { Title: ['The Title field is required.'] } });
    if (title.length > 200) return res.status(400).json({ errors: { Title: ['Max 200 characters.'] } });
    if (priority && !VALID_PRIORITIES.includes(priority))
      return res.status(400).json({ errors: { Priority: ['Invalid priority value.'] } });
    if (status && !VALID_STATUSES.includes(status))
      return res.status(400).json({ errors: { Status: ['Invalid status value.'] } });
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate))
      return res.status(400).json({ errors: { DueDate: ['Due date must be on or after the start date.'] } });

    if (categoryId) {
      const cat = await DanhMuc.findOne({ where: { id: categoryId, nguoi_dung_id: userId } });
      if (!cat) return res.status(400).json({ message: 'Category does not belong to this user or does not exist.' });
    }

    const now = new Date();
    const task = await CongViec.create({
      nguoi_dung_id: userId,
      tieu_de: title,
      mo_ta: description || null,
      muc_do_uu_tien: priority || 'TRUNG_BINH',
      trang_thai: status || 'CHUA_LAM',
      danh_muc_id: categoryId || null,
      ngay_bat_dau: startDate || null,
      han_hoan_thanh: dueDate || null,
      ngay_hoan_thanh: status === 'HOAN_THANH' ? now : null,
      ngay_tao: now,
      ngay_cap_nhat: now,
      file_dinh_kem: attachments && Array.isArray(attachments) && attachments.length > 0
        ? JSON.stringify(attachments) : null,
    });

    return res.status(201)
      .location(`/api/users/${userId}/tasks/${task.id}`)
      .json(toResponse(task));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/users/:userId/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, priority, status, categoryId, startDate, dueDate } = req.body;
    const userId = parseInt(req.params.userId, 10);

    const task = await CongViec.findOne({ where: { id: req.params.id, nguoi_dung_id: userId } });
    if (!task) return res.status(404).json();

    if (!title?.trim()) return res.status(400).json({ errors: { Title: ['The Title field is required.'] } });
    if (priority && !VALID_PRIORITIES.includes(priority))
      return res.status(400).json({ errors: { Priority: ['Invalid priority value.'] } });
    if (status && !VALID_STATUSES.includes(status))
      return res.status(400).json({ errors: { Status: ['Invalid status value.'] } });
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate))
      return res.status(400).json({ errors: { DueDate: ['Due date must be on or after the start date.'] } });

    if (categoryId) {
      const cat = await DanhMuc.findOne({ where: { id: categoryId, nguoi_dung_id: userId } });
      if (!cat) return res.status(400).json({ message: 'Category does not belong to this user or does not exist.' });
    }

    task.tieu_de = title;
    task.mo_ta = description || null;
    task.muc_do_uu_tien = priority || 'TRUNG_BINH';
    task.trang_thai = status || 'CHUA_LAM';
    task.danh_muc_id = categoryId || null;
    task.ngay_bat_dau = startDate || null;
    task.han_hoan_thanh = dueDate || null;
    task.ngay_hoan_thanh = status === 'HOAN_THANH' ? (task.ngay_hoan_thanh || new Date()) : null;
    task.ngay_cap_nhat = new Date();
    await task.save();

    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/users/:userId/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await CongViec.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    if (!task) return res.status(404).json();
    await task.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
