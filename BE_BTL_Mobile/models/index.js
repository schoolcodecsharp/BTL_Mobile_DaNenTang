const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'todo_list',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'your_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,
  }
);

// ── NguoiDung ───────────────────────────────────────────────
const NguoiDung = sequelize.define('NguoiDung', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ten_dang_nhap: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  mat_khau: { type: DataTypes.STRING(255), allowNull: false },
  ho_ten: { type: DataTypes.STRING(100) },
  anh_dai_dien: { type: DataTypes.STRING(255) },
  ngay_tao: { type: DataTypes.DATE },
  trang_thai: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'nguoi_dung', timestamps: false });

// ── DanhMuc ─────────────────────────────────────────────────
const DanhMuc = sequelize.define('DanhMuc', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  ten_danh_muc: { type: DataTypes.STRING(100), allowNull: false },
  mo_ta: { type: DataTypes.STRING(255) },
  mau_sac: { type: DataTypes.STRING(20) },
}, { tableName: 'danh_muc', timestamps: false });

// ── CongViec ────────────────────────────────────────────────
const CongViec = sequelize.define('CongViec', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  danh_muc_id: { type: DataTypes.INTEGER },
  tieu_de: { type: DataTypes.STRING(200), allowNull: false },
  mo_ta: { type: DataTypes.TEXT },
  muc_do_uu_tien: { type: DataTypes.STRING(20) },
  trang_thai: { type: DataTypes.STRING(20) },
  ngay_bat_dau: { type: DataTypes.DATE },
  han_hoan_thanh: { type: DataTypes.DATE },
  ngay_hoan_thanh: { type: DataTypes.DATE },
  ngay_tao: { type: DataTypes.DATE },
  ngay_cap_nhat: { type: DataTypes.DATE },
  file_dinh_kem: { type: DataTypes.TEXT, defaultValue: null }, // JSON array of attachment URLs
  lap_lai: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'KHONG' },
  da_tao_lan_tiep: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ngay_xoa: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'cong_viec', timestamps: false });

// ── NhacNho ─────────────────────────────────────────────────
const NhacNho = sequelize.define('NhacNho', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cong_viec_id: { type: DataTypes.INTEGER, allowNull: false },
  thoi_gian_nhac: { type: DataTypes.DATE, allowNull: false },
  loai_nhac: { type: DataTypes.STRING(20) },
  da_gui: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'nhac_nho', timestamps: false });

// ── ThongBao ────────────────────────────────────────────────
const ThongBao = sequelize.define('ThongBao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  cong_viec_id: { type: DataTypes.INTEGER },
  tieu_de: { type: DataTypes.STRING(200), allowNull: false },
  noi_dung: { type: DataTypes.TEXT },
  da_doc: { type: DataTypes.BOOLEAN, defaultValue: false },
  ngay_tao: { type: DataTypes.DATE },
  nhom_id: { type: DataTypes.INTEGER },
  cong_viec_nhom_id: { type: DataTypes.INTEGER },
  loai: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'HE_THONG' },
}, { tableName: 'thong_bao', timestamps: false });

// ── LichSuCongViec ──────────────────────────────────────────
const LichSuCongViec = sequelize.define('LichSuCongViec', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cong_viec_id: { type: DataTypes.INTEGER, allowNull: false },
  trang_thai_cu: { type: DataTypes.STRING(30) },
  trang_thai_moi: { type: DataTypes.STRING(30) },
  thoi_gian_thay_doi: { type: DataTypes.DATE },
}, { tableName: 'lich_su_cong_viec', timestamps: false });

// ── Nhom (Groups) ───────────────────────────────────────────
const Nhom = sequelize.define('Nhom', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ten_nhom: { type: DataTypes.STRING(100), allowNull: false },
  mo_ta: { type: DataTypes.TEXT },
  truong_nhom_id: { type: DataTypes.INTEGER, allowNull: false },
  ngay_tao: { type: DataTypes.DATE },
}, { tableName: 'nhom', timestamps: false });

// ── ThanhVienNhom (Group Members) ───────────────────────────
const ThanhVienNhom = sequelize.define('ThanhVienNhom', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nhom_id: { type: DataTypes.INTEGER, allowNull: false },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  vai_tro: { type: DataTypes.ENUM('TRUONG_NHOM', 'THANH_VIEN'), defaultValue: 'THANH_VIEN' },
  ngay_tham_gia: { type: DataTypes.DATE },
}, { tableName: 'thanh_vien_nhom', timestamps: false,
  indexes: [{ name: 'uq_nhom_nd', unique: true, fields: ['nhom_id', 'nguoi_dung_id'] }],
});

// Only the SHA-256 digest is stored; the bearer token is returned once at login.
const PhienDangNhap = sequelize.define('PhienDangNhap', {
  token_hash: { type: DataTypes.STRING(64), primaryKey: true },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  het_han: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'phien_dang_nhap', timestamps: false });
PhienDangNhap.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', onDelete: 'CASCADE' });

// ── CongViecNhom (Group Tasks) ──────────────────────────────
const CongViecNhom = sequelize.define('CongViecNhom', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nhom_id: { type: DataTypes.INTEGER, allowNull: false },
  nguoi_giao_id: { type: DataTypes.INTEGER, allowNull: false },
  nguoi_nhan_id: { type: DataTypes.INTEGER },
  tieu_de: { type: DataTypes.STRING(200), allowNull: false },
  mo_ta: { type: DataTypes.TEXT },
  muc_do_uu_tien: { type: DataTypes.STRING(20), defaultValue: 'TRUNG_BINH' },
  trang_thai: { type: DataTypes.STRING(20), defaultValue: 'CHUA_LAM' },
  han_hoan_thanh: { type: DataTypes.DATE },
  ngay_tao: { type: DataTypes.DATE },
  ngay_cap_nhat: { type: DataTypes.DATE },
  file_dinh_kem: { type: DataTypes.TEXT, defaultValue: null },
}, { tableName: 'cong_viec_nhom', timestamps: false });

// ── Associations ────────────────────────────────────────────
NguoiDung.hasMany(DanhMuc, { foreignKey: 'nguoi_dung_id', as: 'danhMucs' });
DanhMuc.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', as: 'nguoiDung' });

NguoiDung.hasMany(CongViec, { foreignKey: 'nguoi_dung_id', as: 'congViecs' });
CongViec.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', as: 'nguoiDung' });

DanhMuc.hasMany(CongViec, { foreignKey: 'danh_muc_id', as: 'congViecs' });
CongViec.belongsTo(DanhMuc, { foreignKey: 'danh_muc_id', as: 'danhMuc' });

CongViec.hasMany(NhacNho, { foreignKey: 'cong_viec_id', as: 'nhacNhos' });
NhacNho.belongsTo(CongViec, { foreignKey: 'cong_viec_id', as: 'congViec' });

NguoiDung.hasMany(ThongBao, { foreignKey: 'nguoi_dung_id', as: 'thongBaos' });
ThongBao.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', as: 'nguoiDung' });
CongViec.hasMany(ThongBao, { foreignKey: 'cong_viec_id', as: 'thongBaos' });
ThongBao.belongsTo(CongViec, { foreignKey: 'cong_viec_id', as: 'congViec' });

CongViec.hasMany(LichSuCongViec, { foreignKey: 'cong_viec_id', as: 'lichSus' });
LichSuCongViec.belongsTo(CongViec, { foreignKey: 'cong_viec_id', as: 'congViec' });

// Group associations
Nhom.hasMany(ThanhVienNhom, { foreignKey: 'nhom_id', as: 'thanhViens' });
ThanhVienNhom.belongsTo(Nhom, { foreignKey: 'nhom_id', as: 'nhom' });

NguoiDung.hasMany(ThanhVienNhom, { foreignKey: 'nguoi_dung_id', as: 'nhomThamGia' });
ThanhVienNhom.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', as: 'nguoiDung' });

Nhom.belongsTo(NguoiDung, { foreignKey: 'truong_nhom_id', as: 'truongNhom' });
NguoiDung.hasMany(Nhom, { foreignKey: 'truong_nhom_id', as: 'nhomLanh' });

Nhom.hasMany(CongViecNhom, { foreignKey: 'nhom_id', as: 'congViecs' });
CongViecNhom.belongsTo(Nhom, { foreignKey: 'nhom_id', as: 'nhom' });

NguoiDung.hasMany(CongViecNhom, { foreignKey: 'nguoi_giao_id', as: 'congViecsGiao' });
CongViecNhom.belongsTo(NguoiDung, { foreignKey: 'nguoi_giao_id', as: 'nguoiGiao' });

NguoiDung.hasMany(CongViecNhom, { foreignKey: 'nguoi_nhan_id', as: 'congViecsNhan' });
CongViecNhom.belongsTo(NguoiDung, { foreignKey: 'nguoi_nhan_id', as: 'nguoiNhan' });

const BuocCongViec = sequelize.define('BuocCongViec', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cong_viec_id: { type: DataTypes.INTEGER, allowNull: false },
  noi_dung: { type: DataTypes.STRING(200), allowNull: false },
  hoan_thanh: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'buoc_cong_viec', timestamps: false });
BuocCongViec.belongsTo(CongViec, { foreignKey: 'cong_viec_id', onDelete: 'CASCADE' });

const BinhLuanNhom = sequelize.define('BinhLuanNhom', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cong_viec_nhom_id: { type: DataTypes.INTEGER, allowNull: false },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  noi_dung: { type: DataTypes.TEXT, allowNull: false },
  ngay_tao: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'binh_luan_nhom', timestamps: false });
BinhLuanNhom.belongsTo(CongViecNhom, { foreignKey: 'cong_viec_nhom_id', onDelete: 'CASCADE' });
BinhLuanNhom.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', as: 'tacGia', onDelete: 'CASCADE' });

const NhatKyNhom = sequelize.define('NhatKyNhom', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nhom_id: { type: DataTypes.INTEGER, allowNull: false },
  nguoi_dung_id: { type: DataTypes.INTEGER, allowNull: false },
  cong_viec_nhom_id: { type: DataTypes.INTEGER },
  hanh_dong: { type: DataTypes.STRING(40), allowNull: false },
  noi_dung: { type: DataTypes.TEXT, allowNull: false },
  ngay_tao: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'nhat_ky_nhom', timestamps: false });
NhatKyNhom.belongsTo(Nhom, { foreignKey: 'nhom_id', onDelete: 'CASCADE' });
NhatKyNhom.belongsTo(NguoiDung, { foreignKey: 'nguoi_dung_id', as: 'nguoiThucHien', onDelete: 'CASCADE' });
NhatKyNhom.belongsTo(CongViecNhom, { foreignKey: 'cong_viec_nhom_id', as: 'congViecNhom', onDelete: 'SET NULL' });

module.exports = {
  BuocCongViec,
  BinhLuanNhom,
  NhatKyNhom,
  sequelize,
  NguoiDung,
  DanhMuc,
  CongViec,
  NhacNho,
  ThongBao,
  LichSuCongViec,
  Nhom,
  ThanhVienNhom,
  CongViecNhom,
  PhienDangNhap,
};
