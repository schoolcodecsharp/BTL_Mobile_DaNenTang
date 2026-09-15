const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { NguoiDung } = require('../models');
const { Op } = require('sequelize');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    if (!username?.trim() || !email?.trim() || !password?.trim())
      return res.status(400).json({ message: 'Username, email and password are required.' });

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedFullName = fullName?.trim() || null;

    if (trimmedUsername.length > 50 || trimmedEmail.length > 100 || (trimmedFullName && trimmedFullName.length > 100))
      return res.status(400).json({ message: 'Username, email or full name is invalid.' });

    // Simple email check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return res.status(400).json({ message: 'Username, email or full name is invalid.' });

    const exists = await NguoiDung.findOne({
      where: { [Op.or]: [{ ten_dang_nhap: trimmedUsername }, { email: trimmedEmail }] },
    });
    if (exists) return res.status(400).json({ message: 'Username or email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await NguoiDung.create({
      ten_dang_nhap: trimmedUsername,
      email: trimmedEmail,
      mat_khau: hashedPassword,
      ho_ten: trimmedFullName,
      ngay_tao: new Date(),
      trang_thai: true,
    });

    return res.status(200).json({
      id: user.id,
      username: user.ten_dang_nhap,
      email: user.email,
      fullName: user.ho_ten,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail?.trim() || !password)
      return res.status(400).json({ message: 'Invalid credentials.' });

    const identifier = usernameOrEmail.trim();
    const user = await NguoiDung.findOne({
      where: { [Op.or]: [{ ten_dang_nhap: identifier }, { email: identifier }] },
    });

    if (!user || !user.trang_thai)
      return res.status(401).json({ message: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.mat_khau).catch(() => false);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    return res.status(200).json({
      id: user.id,
      username: user.ten_dang_nhap,
      email: user.email,
      fullName: user.ho_ten,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
