const { Router } = require('express');
const { Op } = require('sequelize');
const { sequelize, CongViec, DanhMuc, BuocCongViec } = require('../models');
const { VALID_RECURRENCES, nextOccurrence } = require('../lib/recurrence');

const router = Router({ mergeParams: true });

const VALID_PRIORITIES = ['THAP', 'TRUNG_BINH', 'CAO'];
const VALID_STATUSES = ['CHUA_LAM', 'DANG_LAM', 'HOAN_THANH', 'QUA_HAN'];
const TRASH_DAYS = 30;

async function purgeExpiredTrash(userId) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000);
  await CongViec.destroy({ where: { nguoi_dung_id: userId, ngay_xoa: { [Op.lt]: cutoff } } });
}

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
    lapLai: task.lap_lai || 'KHONG',
    ngayXoa: task.ngay_xoa,
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
    await purgeExpiredTrash(req.params.userId);
    const tasks = await CongViec.findAll({
      where: { nguoi_dung_id: req.params.userId, ngay_xoa: null },
      include: [{ model: DanhMuc, as: 'danhMuc' }],
      order: [['han_hoan_thanh', 'ASC']],
    });
    return res.json(tasks.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/:userId/tasks/trash
router.get('/trash', async (req, res) => {
  try {
    await purgeExpiredTrash(req.params.userId);
    const tasks = await CongViec.findAll({
      where: { nguoi_dung_id: req.params.userId, ngay_xoa: { [Op.not]: null } },
      order: [['ngay_xoa', 'DESC']],
    });
    return res.json(tasks.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const task = await CongViec.findOne({ where: { id: req.params.id, nguoi_dung_id: req.params.userId, ngay_xoa: { [Op.not]: null } } });
    if (!task) return res.status(404).json({ message: 'Không tìm thấy công việc trong thùng rác.' });
    task.ngay_xoa = null;
    task.ngay_cap_nhat = new Date();
    await task.save();
    return res.json(toResponse(task));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.delete('/:id/permanent', async (req, res) => {
  try {
    const count = await CongViec.destroy({ where: { id: req.params.id, nguoi_dung_id: req.params.userId, ngay_xoa: { [Op.not]: null } } });
    return count ? res.status(204).end() : res.status(404).json({ message: 'Không tìm thấy công việc trong thùng rác.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/:userId/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await CongViec.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId, ngay_xoa: null },
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
    const { title, description, priority, status, categoryId, startDate, dueDate, attachments, recurrence } = req.body;
    const userId = parseInt(req.params.userId, 10);

    if (!title?.trim()) return res.status(400).json({ errors: { Title: ['The Title field is required.'] } });
    if (title.length > 200) return res.status(400).json({ errors: { Title: ['Max 200 characters.'] } });
    if (priority && !VALID_PRIORITIES.includes(priority))
      return res.status(400).json({ errors: { Priority: ['Invalid priority value.'] } });
    if (status && !VALID_STATUSES.includes(status))
      return res.status(400).json({ errors: { Status: ['Invalid status value.'] } });
    if (recurrence && !VALID_RECURRENCES.includes(recurrence))
      return res.status(400).json({ errors: { Recurrence: ['Invalid recurrence value.'] } });
    if (recurrence && recurrence !== 'KHONG' && !dueDate)
      return res.status(400).json({ errors: { DueDate: ['Recurring tasks require a due date.'] } });
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
      lap_lai: recurrence || 'KHONG',
      da_tao_lan_tiep: false,
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
    const { title, description, priority, status, categoryId, startDate, dueDate, attachments, recurrence } = req.body;
    const userId = parseInt(req.params.userId, 10);

    if (!title?.trim()) return res.status(400).json({ errors: { Title: ['The Title field is required.'] } });
    if (priority && !VALID_PRIORITIES.includes(priority))
      return res.status(400).json({ errors: { Priority: ['Invalid priority value.'] } });
    if (status && !VALID_STATUSES.includes(status))
      return res.status(400).json({ errors: { Status: ['Invalid status value.'] } });
    if (recurrence && !VALID_RECURRENCES.includes(recurrence))
      return res.status(400).json({ errors: { Recurrence: ['Invalid recurrence value.'] } });
    if (recurrence && recurrence !== 'KHONG' && !dueDate)
      return res.status(400).json({ errors: { DueDate: ['Recurring tasks require a due date.'] } });
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate))
      return res.status(400).json({ errors: { DueDate: ['Due date must be on or after the start date.'] } });

    if (categoryId) {
      const cat = await DanhMuc.findOne({ where: { id: categoryId, nguoi_dung_id: userId } });
      if (!cat) return res.status(400).json({ message: 'Category does not belong to this user or does not exist.' });
    }

    const found = await sequelize.transaction(async transaction => {
      const task = await CongViec.findOne({
        where: { id: req.params.id, nguoi_dung_id: userId, ngay_xoa: null }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!task) return false;
      const previousStatus = task.trang_thai;
      task.tieu_de = title;
      task.mo_ta = description || null;
      task.muc_do_uu_tien = priority || 'TRUNG_BINH';
      task.trang_thai = status || 'CHUA_LAM';
      task.danh_muc_id = categoryId || null;
      task.ngay_bat_dau = startDate || null;
      task.han_hoan_thanh = dueDate || null;
      task.ngay_hoan_thanh = status === 'HOAN_THANH' ? (task.ngay_hoan_thanh || new Date()) : null;
      task.ngay_cap_nhat = new Date();
      task.lap_lai = recurrence || 'KHONG';
      if (attachments !== undefined) {
        task.file_dinh_kem = Array.isArray(attachments) && attachments.length > 0
          ? JSON.stringify(attachments) : null;
      }
      const shouldCreateNext = previousStatus !== 'HOAN_THANH' && task.trang_thai === 'HOAN_THANH' &&
        task.lap_lai !== 'KHONG' && !task.da_tao_lan_tiep;
      if (shouldCreateNext) task.da_tao_lan_tiep = true;
      await task.save({ transaction });
      if (shouldCreateNext) {
        const nextDue = nextOccurrence(task.han_hoan_thanh, task.lap_lai);
        if (!nextDue) throw new Error('Recurring task is missing a valid due date.');
        const nextStart = task.ngay_bat_dau ? nextOccurrence(task.ngay_bat_dau, task.lap_lai) : null;
        const nextTask = await CongViec.create({
          nguoi_dung_id: task.nguoi_dung_id, danh_muc_id: task.danh_muc_id,
          tieu_de: task.tieu_de, mo_ta: task.mo_ta, muc_do_uu_tien: task.muc_do_uu_tien,
          trang_thai: 'CHUA_LAM', ngay_bat_dau: nextStart, han_hoan_thanh: nextDue,
          ngay_hoan_thanh: null, ngay_tao: new Date(), ngay_cap_nhat: new Date(),
          file_dinh_kem: task.file_dinh_kem, lap_lai: task.lap_lai, da_tao_lan_tiep: false,
        }, { transaction });
        const steps = await BuocCongViec.findAll({ where: { cong_viec_id: task.id }, transaction });
        if (steps.length) await BuocCongViec.bulkCreate(steps.map(step => ({
          cong_viec_id: nextTask.id, noi_dung: step.noi_dung, hoan_thanh: false,
        })), { transaction });
      }
      return true;
    });
    if (!found) return res.status(404).json();

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
      where: { id: req.params.id, nguoi_dung_id: req.params.userId, ngay_xoa: null },
    });
    if (!task) return res.status(404).json();
    task.ngay_xoa = new Date();
    task.ngay_cap_nhat = new Date();
    await task.save();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
