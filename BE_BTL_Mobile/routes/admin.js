const { Router } = require('express');
const { Op } = require('sequelize');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { NguoiDung } = require('../models');

const router = Router();
router.use(requireAuth, requireAdmin);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const userFields = ['id', 'ho_ten', 'ten_dang_nhap', 'email', 'vai_tro', 'trang_thai', 'ngay_tao'];
router.param('id', (req, res, next, id) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({ message: 'ID tài khoản không hợp lệ.' });
  }
  next();
});

router.get('/summary', async (req, res, next) => {
  try {
    const [total, active, admin] = await Promise.all([
      NguoiDung.count(), NguoiDung.count({ where: { trang_thai: true } }),
      NguoiDung.findByPk(req.auth.userId, { attributes: ['id', 'ho_ten', 'ten_dang_nhap'] }),
    ]);
    res.json({ total, active, locked: total - active, admin });
  } catch (error) { next(error); }
});

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const where = {};
    if (search) {
      // Bound values, escaped wildcard characters: search is a literal substring.
      const term = '%' + search.replace(/[\\%_]/g, '\\$&') + '%';
      where[Op.or] = ['ho_ten', 'ten_dang_nhap', 'email'].map(field => ({ [field]: { [Op.like]: term } }));
    }
    if (req.query.status === 'active') where.trang_thai = true;
    if (req.query.status === 'locked') where.trang_thai = false;
    if (['ADMIN', 'USER'].includes(req.query.role)) where.vai_tro = req.query.role;
    const { rows, count } = await NguoiDung.findAndCountAll({
      attributes: userFields, where, limit: 10, offset: (page - 1) * 10, order: [['id', 'DESC']],
    });
    res.json({ rows, total: count, page, pageSize: 10 });
  } catch (error) { next(error); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { fullName, email } = req.body;
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 100 ||
        typeof email !== 'string' || email.trim().length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Nhập họ tên và email hợp lệ, tối đa 100 ký tự.' });
    }
    const user = await NguoiDung.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    await user.update({ ho_ten: fullName.trim(), email: email.trim() });
    res.json({ id: user.id, fullName: user.ho_ten, email: user.email });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'Email đã được sử dụng bởi tài khoản khác.' });
    next(error);
  }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    if (typeof req.body.active !== 'boolean') return res.status(400).json({ message: 'Trạng thái tài khoản không hợp lệ.' });
    const user = await NguoiDung.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    if (user.vai_tro === 'ADMIN' || user.id === req.auth.userId) {
      return res.status(403).json({ message: 'Không thể khóa hoặc mở khóa quản trị viên tại đây.' });
    }
    await user.update({ trang_thai: req.body.active });
    res.json({ id: user.id, active: user.trang_thai });
  } catch (error) { next(error); }
});
module.exports = router;
