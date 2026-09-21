const path = require('path');
const fs = require('fs');
const { Router } = require('express');
const multer = require('multer');

const router = Router();

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${random}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Loại file không được hỗ trợ.'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/upload  (multipart: field name "file", up to 5 files)
router.post('/', upload.array('file', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Không có file nào được tải lên.' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const urls = req.files.map((f) => ({
    url: `${baseUrl}/uploads/${f.filename}`,
    filename: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
  }));

  return res.status(201).json({ files: urls });
});

// Global error handler for multer errors
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File quá lớn. Tối đa 10 MB mỗi file.' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ message: 'Tối đa 5 file mỗi lần tải lên.' });
  }
  return res.status(400).json({ message: err.message || 'Lỗi tải file.' });
});

module.exports = router;
