const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { NguoiDung } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = Router();

function toResponse(user) {
  return {
    id: user.id,
    username: user.ten_dang_nhap,
    email: user.email,
    fullName: user.ho_ten,
    avatarUrl: user.anh_dai_dien,
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
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (String(req.auth.userId) !== String(req.params.id)) return res.status(403).json({ message: 'Không có quyền sửa hồ sơ này.' });
    const user = await NguoiDung.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const { fullName, email, avatarUrl } = req.body;
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length > 100) return res.status(400).json({ message: 'Họ tên không hợp lệ.' });
      user.ho_ten = fullName.trim() || null;
    }
    if (email !== undefined) {
      const trimmedEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Email không hợp lệ.' });
      }
      user.email = trimmedEmail;
    }
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && (typeof avatarUrl !== 'string' || avatarUrl.length > 255 || !/^(https?:\/\/|\/uploads\/)/.test(avatarUrl))) {
        return res.status(400).json({ message: 'Địa chỉ ảnh đại diện không hợp lệ.' });
      }
      user.anh_dai_dien = avatarUrl;
    }
    await user.save();
    return res.json(toResponse(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', requireAuth, async (req, res) => {
  try {
    if (String(req.auth.userId) !== String(req.params.id)) return res.status(403).json({ message: 'Không có quyền đổi mật khẩu này.' });
    const user = await NguoiDung.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
    }

    const valid = await bcrypt.compare(oldPassword, user.mat_khau);
    if (!valid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    user.mat_khau = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: 'Đổi mật khẩu thành công.' });
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
