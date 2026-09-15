const { Router } = require('express');
const { ThongBao } = require('../models');

const router = Router({ mergeParams: true });

function toResponse(n) {
  return {
    id: n.id,
    nguoiDungId: n.nguoi_dung_id,
    congViecId: n.cong_viec_id,
    tieuDe: n.tieu_de,
    noiDung: n.noi_dung,
    daDoc: n.da_doc,
    ngayTao: n.ngay_tao,
  };
}

// GET /api/users/:userId/notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await ThongBao.findAll({
      where: { nguoi_dung_id: req.params.userId },
      order: [['ngay_tao', 'DESC']],
    });
    return res.json(notifications.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/:userId/notifications/:id
router.get('/:id', async (req, res) => {
  try {
    const n = await ThongBao.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    return n ? res.json(toResponse(n)) : res.status(404).json();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/users/:userId/notifications
router.post('/', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { congViecId, tieuDe, noiDung } = req.body;
    const n = await ThongBao.create({
      nguoi_dung_id: userId,
      cong_viec_id: congViecId || null,
      tieu_de: tieuDe,
      noi_dung: noiDung || null,
      da_doc: false,
      ngay_tao: new Date(),
    });
    return res.status(201)
      .location(`/api/users/${userId}/notifications/${n.id}`)
      .json(toResponse(n));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PATCH /api/users/:userId/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const n = await ThongBao.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    if (!n) return res.status(404).json();
    n.da_doc = true;
    await n.save();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/users/:userId/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const n = await ThongBao.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    if (!n) return res.status(404).json();
    await n.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
