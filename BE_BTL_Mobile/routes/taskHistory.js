const { Router } = require('express');
const { LichSuCongViec } = require('../models');

const router = Router({ mergeParams: true });

function toResponse(h) {
  return {
    id: h.id,
    congViecId: h.cong_viec_id,
    trangThaiCu: h.trang_thai_cu,
    trangThaiMoi: h.trang_thai_moi,
    thoiGianThayDoi: h.thoi_gian_thay_doi,
  };
}

// GET /api/tasks/:taskId/history
router.get('/', async (req, res) => {
  try {
    const history = await LichSuCongViec.findAll({
      where: { cong_viec_id: req.params.taskId },
      order: [['thoi_gian_thay_doi', 'DESC']],
    });
    return res.json(history.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/tasks/:taskId/history/:id
router.get('/:id', async (req, res) => {
  try {
    const h = await LichSuCongViec.findByPk(req.params.id);
    if (!h || h.cong_viec_id !== parseInt(req.params.taskId, 10))
      return res.status(404).json();
    return res.json(toResponse(h));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/tasks/:taskId/history
router.post('/', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { trangThaiCu, trangThaiMoi } = req.body;
    const h = await LichSuCongViec.create({
      cong_viec_id: taskId,
      trang_thai_cu: trangThaiCu || null,
      trang_thai_moi: trangThaiMoi || null,
      thoi_gian_thay_doi: new Date(),
    });
    return res.status(201)
      .location(`/api/tasks/${taskId}/history/${h.id}`)
      .json(toResponse(h));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/tasks/:taskId/history/:id
router.delete('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const h = await LichSuCongViec.findByPk(req.params.id);
    if (!h || h.cong_viec_id !== taskId) return res.status(404).json();
    await h.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
