const { Router } = require('express');
const { NhacNho } = require('../models');

const router = Router({ mergeParams: true });

function toResponse(r) {
  return {
    id: r.id,
    congViecId: r.cong_viec_id,
    thoiGianNhac: r.thoi_gian_nhac,
    loaiNhac: r.loai_nhac,
    daGui: r.da_gui,
  };
}

// GET /api/tasks/:taskId/reminders
router.get('/', async (req, res) => {
  try {
    const reminders = await NhacNho.findAll({ where: { cong_viec_id: req.params.taskId } });
    return res.json(reminders.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/tasks/:taskId/reminders/:id
router.get('/:id', async (req, res) => {
  try {
    const reminder = await NhacNho.findByPk(req.params.id);
    if (!reminder || reminder.cong_viec_id !== parseInt(req.params.taskId, 10))
      return res.status(404).json();
    return res.json(toResponse(reminder));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/tasks/:taskId/reminders
router.post('/', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { thoiGianNhac, loaiNhac } = req.body;
    const reminder = await NhacNho.create({
      cong_viec_id: taskId,
      thoi_gian_nhac: thoiGianNhac,
      loai_nhac: loaiNhac,
      da_gui: false,
    });
    return res.status(201)
      .location(`/api/tasks/${taskId}/reminders/${reminder.id}`)
      .json(toResponse(reminder));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/tasks/:taskId/reminders/:id
router.put('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const reminder = await NhacNho.findByPk(req.params.id);
    if (!reminder || reminder.cong_viec_id !== taskId) return res.status(404).json();

    const { thoiGianNhac, loaiNhac } = req.body;
    if (reminder.thoi_gian_nhac?.getTime() !== new Date(thoiGianNhac).getTime() || reminder.loai_nhac !== loaiNhac)
      reminder.da_gui = false;
    reminder.thoi_gian_nhac = thoiGianNhac;
    reminder.loai_nhac = loaiNhac;
    await reminder.save();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/tasks/:taskId/reminders/:id
router.delete('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const reminder = await NhacNho.findByPk(req.params.id);
    if (!reminder || reminder.cong_viec_id !== taskId) return res.status(404).json();
    await reminder.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
