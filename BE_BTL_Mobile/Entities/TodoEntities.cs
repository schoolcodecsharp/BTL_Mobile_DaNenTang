namespace BE_BTL_Mobile.Entities;

public enum MucDoUuTien { THAP, TRUNG_BINH, CAO }
public enum TrangThaiCongViec { CHUA_LAM, DANG_LAM, HOAN_THANH, QUA_HAN }
public enum LoaiNhac { THONG_BAO, EMAIL }

public class NguoiDung
{
    public int Id { get; set; }
    public string TenDangNhap { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string MatKhau { get; set; } = null!;
    public string? HoTen { get; set; }
    public string? AnhDaiDien { get; set; }
    public DateTime NgayTao { get; set; }
    public bool TrangThai { get; set; }
    public ICollection<DanhMuc> DanhMucs { get; set; } = new List<DanhMuc>();
    public ICollection<CongViec> CongViecs { get; set; } = new List<CongViec>();
    public ICollection<ThongBao> ThongBaos { get; set; } = new List<ThongBao>();
}

public class DanhMuc
{
    public int Id { get; set; }
    public int NguoiDungId { get; set; }
    public string TenDanhMuc { get; set; } = null!;
    public string? MoTa { get; set; }
    public string? MauSac { get; set; }
    public NguoiDung NguoiDung { get; set; } = null!;
    public ICollection<CongViec> CongViecs { get; set; } = new List<CongViec>();
}

public class CongViec
{
    public int Id { get; set; }
    public int NguoiDungId { get; set; }
    public int? DanhMucId { get; set; }
    public string TieuDe { get; set; } = null!;
    public string? MoTa { get; set; }
    public MucDoUuTien MucDoUuTien { get; set; }
    public TrangThaiCongViec TrangThai { get; set; }
    public DateTime? NgayBatDau { get; set; }
    public DateTime? HanHoanThanh { get; set; }
    public DateTime? NgayHoanThanh { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
    public NguoiDung NguoiDung { get; set; } = null!;
    public DanhMuc? DanhMuc { get; set; }
    public ICollection<NhacNho> NhacNhos { get; set; } = new List<NhacNho>();
    public ICollection<ThongBao> ThongBaos { get; set; } = new List<ThongBao>();
    public ICollection<LichSuCongViec> LichSus { get; set; } = new List<LichSuCongViec>();
}

public class NhacNho { public int Id { get; set; } public int CongViecId { get; set; } public DateTime ThoiGianNhac { get; set; } public LoaiNhac LoaiNhac { get; set; } public bool DaGui { get; set; } public CongViec CongViec { get; set; } = null!; }
public class ThongBao { public int Id { get; set; } public int NguoiDungId { get; set; } public int? CongViecId { get; set; } public string TieuDe { get; set; } = null!; public string? NoiDung { get; set; } public bool DaDoc { get; set; } public DateTime NgayTao { get; set; } public NguoiDung NguoiDung { get; set; } = null!; public CongViec? CongViec { get; set; } }
public class LichSuCongViec { public int Id { get; set; } public int CongViecId { get; set; } public string? TrangThaiCu { get; set; } public string? TrangThaiMoi { get; set; } public DateTime ThoiGianThayDoi { get; set; } public CongViec CongViec { get; set; } = null!; }