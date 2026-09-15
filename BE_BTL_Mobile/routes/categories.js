const { Router } = require('express');
const { DanhMuc } = require('../models');

const router = Router({ mergeParams: true });

function toResponse(cat) {
  return {
    id: cat.id,
    nguoiDungId: cat.nguoi_dung_id,
    tenDanhMuc: cat.ten_danh_muc,
    moTa: cat.mo_ta,
    mauSac: cat.mau_sac,
  };
}

// GET /api/users/:userId/categories
router.get('/', async (req, res) => {
  try {
    const categories = await DanhMuc.findAll({
      where: { nguoi_dung_id: req.params.userId },
      order: [['ten_danh_muc', 'ASC']],
    });
    return res.json(categories.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/:userId/categories/:id
router.get('/:id', async (req, res) => {
  try {
    const cat = await DanhMuc.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    return cat ? res.json(toResponse(cat)) : res.status(404).json();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/users/:userId/categories
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ errors: { Name: ['The Name field is required.'] } });
    if (name.length > 100) return res.status(400).json({ errors: { Name: ['Max 100 characters.'] } });

    const cat = await DanhMuc.create({
      nguoi_dung_id: parseInt(req.params.userId, 10),
      ten_danh_muc: name,
      mo_ta: description || null,
      mau_sac: color || null,
    });
    return res.status(201)
      .location(`/api/users/${req.params.userId}/categories/${cat.id}`)
      .json(toResponse(cat));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/users/:userId/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const cat = await DanhMuc.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    if (!cat) return res.status(404).json();

    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ errors: { Name: ['The Name field is required.'] } });

    cat.ten_danh_muc = name;
    cat.mo_ta = description || null;
    cat.mau_sac = color || null;
    await cat.save();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/users/:userId/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const cat = await DanhMuc.findOne({
      where: { id: req.params.id, nguoi_dung_id: req.params.userId },
    });
    if (!cat) return res.status(404).json();
    await cat.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
