using BE_BTL_Mobile.Entities;
using Microsoft.EntityFrameworkCore;

namespace BE_BTL_Mobile.Data;

public class TodoDbContext(DbContextOptions<TodoDbContext> options) : DbContext(options)
{
    public DbSet<NguoiDung> NguoiDungs => Set<NguoiDung>();
    public DbSet<DanhMuc> DanhMucs => Set<DanhMuc>();
    public DbSet<CongViec> CongViecs => Set<CongViec>();
    public DbSet<NhacNho> NhacNhos => Set<NhacNho>();
    public DbSet<ThongBao> ThongBaos => Set<ThongBao>();
    public DbSet<LichSuCongViec> LichSuCongViecs => Set<LichSuCongViec>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NguoiDung>(e => { e.ToTable("nguoi_dung"); e.HasKey(x => x.Id); e.Property(x => x.TenDangNhap).HasColumnName("ten_dang_nhap").HasMaxLength(50).IsRequired(); e.Property(x => x.Email).HasMaxLength(100).IsRequired(); e.Property(x => x.MatKhau).HasColumnName("mat_khau").HasMaxLength(255).IsRequired(); e.Property(x => x.HoTen).HasColumnName("ho_ten").HasMaxLength(100); e.Property(x => x.AnhDaiDien).HasColumnName("anh_dai_dien").HasMaxLength(255); e.Property(x => x.NgayTao).HasColumnName("ngay_tao"); e.Property(x => x.TrangThai).HasColumnName("trang_thai"); e.HasIndex(x => x.TenDangNhap).IsUnique(); e.HasIndex(x => x.Email).IsUnique(); });
        modelBuilder.Entity<DanhMuc>(e => { e.ToTable("danh_muc"); e.Property(x => x.TenDanhMuc).HasColumnName("ten_danh_muc").HasMaxLength(100).IsRequired(); e.Property(x => x.NguoiDungId).HasColumnName("nguoi_dung_id"); e.Property(x => x.MoTa).HasColumnName("mo_ta").HasMaxLength(255); e.Property(x => x.MauSac).HasColumnName("mau_sac").HasMaxLength(20); e.HasOne(x => x.NguoiDung).WithMany(x => x.DanhMucs).HasForeignKey(x => x.NguoiDungId).OnDelete(DeleteBehavior.Cascade); });
        modelBuilder.Entity<CongViec>(e => { e.ToTable("cong_viec"); e.Property(x => x.TieuDe).HasColumnName("tieu_de").HasMaxLength(200).IsRequired(); e.Property(x => x.MoTa).HasColumnName("mo_ta"); e.Property(x => x.MucDoUuTien).HasColumnName("muc_do_uu_tien").HasConversion<string>().HasMaxLength(20); e.Property(x => x.TrangThai).HasColumnName("trang_thai").HasConversion<string>().HasMaxLength(20); e.Property(x => x.NguoiDungId).HasColumnName("nguoi_dung_id"); e.Property(x => x.DanhMucId).HasColumnName("danh_muc_id"); e.Property(x => x.NgayBatDau).HasColumnName("ngay_bat_dau"); e.Property(x => x.HanHoanThanh).HasColumnName("han_hoan_thanh"); e.Property(x => x.NgayHoanThanh).HasColumnName("ngay_hoan_thanh"); e.Property(x => x.NgayTao).HasColumnName("ngay_tao"); e.Property(x => x.NgayCapNhat).HasColumnName("ngay_cap_nhat"); e.HasOne(x => x.NguoiDung).WithMany(x => x.CongViecs).HasForeignKey(x => x.NguoiDungId).OnDelete(DeleteBehavior.Cascade); e.HasOne(x => x.DanhMuc).WithMany(x => x.CongViecs).HasForeignKey(x => x.DanhMucId).OnDelete(DeleteBehavior.SetNull); });
        modelBuilder.Entity<NhacNho>(e => { e.ToTable("nhac_nho"); e.Property(x => x.CongViecId).HasColumnName("cong_viec_id"); e.Property(x => x.ThoiGianNhac).HasColumnName("thoi_gian_nhac"); e.Property(x => x.LoaiNhac).HasColumnName("loai_nhac").HasConversion<string>().HasMaxLength(20); e.Property(x => x.DaGui).HasColumnName("da_gui"); e.HasOne(x => x.CongViec).WithMany(x => x.NhacNhos).HasForeignKey(x => x.CongViecId).OnDelete(DeleteBehavior.Cascade); });
        modelBuilder.Entity<ThongBao>(e => { e.ToTable("thong_bao"); e.Property(x => x.NguoiDungId).HasColumnName("nguoi_dung_id"); e.Property(x => x.CongViecId).HasColumnName("cong_viec_id"); e.Property(x => x.TieuDe).HasColumnName("tieu_de").HasMaxLength(200).IsRequired(); e.Property(x => x.NoiDung).HasColumnName("noi_dung"); e.Property(x => x.DaDoc).HasColumnName("da_doc"); e.Property(x => x.NgayTao).HasColumnName("ngay_tao"); e.HasOne(x => x.NguoiDung).WithMany(x => x.ThongBaos).HasForeignKey(x => x.NguoiDungId).OnDelete(DeleteBehavior.Cascade); e.HasOne(x => x.CongViec).WithMany(x => x.ThongBaos).HasForeignKey(x => x.CongViecId).OnDelete(DeleteBehavior.Cascade); });
        modelBuilder.Entity<LichSuCongViec>(e => { e.ToTable("lich_su_cong_viec"); e.Property(x => x.CongViecId).HasColumnName("cong_viec_id"); e.Property(x => x.TrangThaiCu).HasColumnName("trang_thai_cu").HasMaxLength(30); e.Property(x => x.TrangThaiMoi).HasColumnName("trang_thai_moi").HasMaxLength(30); e.Property(x => x.ThoiGianThayDoi).HasColumnName("thoi_gian_thay_doi"); e.HasOne(x => x.CongViec).WithMany(x => x.LichSus).HasForeignKey(x => x.CongViecId).OnDelete(DeleteBehavior.Cascade); });
    }
}