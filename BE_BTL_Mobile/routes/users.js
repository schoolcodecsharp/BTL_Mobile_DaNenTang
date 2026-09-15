const { Router } = require('express');
const { NguoiDung } = require('../models');

const router = Router();

function toResponse(user) {
  return {
    id: user.id,
    username: user.ten_dang_nhap,
    email: user.email,
    fullName: user.ho_ten,
  };
}

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await NguoiDung.findAll();
    return res.json(users.map(toResponse));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await NguoiDung.findByPk(req.params.id);
    return user ? res.json(toResponse(user)) : res.status(404).json();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const user = await NguoiDung.findByPk(req.params.id);
    if (!user) return res.status(404).json();

    const { fullName, email, avatarUrl } = req.body;
    if (fullName !== undefined) user.ho_ten = fullName;
    if (email !== undefined) user.email = email;
    if (avatarUrl !== undefined) user.anh_dai_dien = avatarUrl;
    await user.save();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await NguoiDung.findByPk(req.params.id);
    if (!user) return res.status(404).json();
    await user.destroy();
    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
