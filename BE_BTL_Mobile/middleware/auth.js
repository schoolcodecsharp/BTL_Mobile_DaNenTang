const { randomBytes, createHash } = require('node:crypto');
const { PhienDangNhap, NguoiDung } = require('../models');

const digest = (token) => createHash('sha256').update(token).digest('hex');

async function createSession(userId) {
  const accessToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await PhienDangNhap.create({ token_hash: digest(accessToken), nguoi_dung_id: userId, het_han: expiresAt });
  return { accessToken, tokenType: 'Bearer', expiresAt };
}

async function requireAuth(req, res, next) {
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(req.get('Authorization') || '');
  if (!match) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
  try {
    const session = await PhienDangNhap.findByPk(digest(match[1]));
    if (!session || new Date(session.het_han) <= new Date()) {
      return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }
    const user = await NguoiDung.findByPk(session.nguoi_dung_id);
    if (!user || !user.trang_thai) return res.status(401).json({ message: 'Tài khoản không khả dụng.' });
    req.auth = { userId: user.id, tokenHash: session.token_hash, role: user.vai_tro };
    next();
  } catch (error) { next(error); }
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Chỉ quản trị viên được truy cập trang này.' });
  }
  next();
}

module.exports = { createSession, requireAuth, requireAdmin };
