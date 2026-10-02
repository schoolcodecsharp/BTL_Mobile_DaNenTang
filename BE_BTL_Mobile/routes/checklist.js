const { Router } = require('express');
const { sequelize, CongViec, BuocCongViec } = require('../models');
const { requireAuth } = require('../middleware/auth');
const router = Router({ mergeParams: true });
router.use(requireAuth);
const format = item => ({ id: item.id, noiDung: item.noi_dung, hoanThanh: item.hoan_thanh });
function endpoint(action) {
  return async (req, res, next) => {
    try {
      if (String(req.auth.userId) !== req.params.userId) return res.status(403).json({ message: 'Không có quyền truy cập công việc.' });
      for (const value of [req.params.taskId, req.params.itemId].filter(value => value !== undefined)) {
        if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) return res.status(400).json({ message: 'ID không hợp lệ.' });
      }
      // Send success only after MySQL has committed the transaction.
      let responseStatus = 200, responseBody;
      const reply = {
        status(code) { responseStatus = code; return this; },
        json(body) { responseBody = body; },
        end() {},
      };
      await sequelize.transaction(async transaction => {
        const task = await CongViec.findOne({ where: { id: req.params.taskId, nguoi_dung_id: req.auth.userId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!task) return reply.status(404).json({ message: 'Không tìm thấy công việc.' });
        await action(req, reply, task, transaction);
      });
      if (responseStatus === 204) return res.status(204).end();
      res.status(responseStatus).json(responseBody);
    } catch (error) { next(error); }
  };
}
router.get('/', endpoint(async (req, res, task, transaction) => {
  const items = await BuocCongViec.findAll({ where: { cong_viec_id: task.id }, order: [['id', 'ASC']], transaction });
  res.json(items.map(format));
}));
router.post('/', endpoint(async (req, res, task, transaction) => {
  const content = req.body?.noiDung;
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 200) return res.status(400).json({ message: 'Bước công việc phải có từ 1 đến 200 ký tự.' });
  const item = await BuocCongViec.create({ cong_viec_id: task.id, noi_dung: content.trim() }, { transaction });
  res.status(201).json(format(item));
}));
router.patch('/:itemId', endpoint(async (req, res, task, transaction) => {
  if (typeof req.body?.hoanThanh !== 'boolean') return res.status(400).json({ message: 'hoanThanh phải là boolean.' });
  const item = await BuocCongViec.findOne({ where: { id: req.params.itemId, cong_viec_id: task.id }, transaction });
  if (!item) return res.status(404).json({ message: 'Không tìm thấy bước công việc.' });
  await item.update({ hoan_thanh: req.body.hoanThanh }, { transaction });
  res.json(format(item));
}));
router.delete('/:itemId', endpoint(async (req, res, task, transaction) => {
  const count = await BuocCongViec.destroy({ where: { id: req.params.itemId, cong_viec_id: task.id }, transaction });
  if (!count) return res.status(404).json({ message: 'Không tìm thấy bước công việc.' });
  res.status(204).end();
}));
module.exports = router;
