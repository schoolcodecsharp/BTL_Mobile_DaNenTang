using BE_BTL_Mobile.Data;
using BE_BTL_Mobile.Entities;
using Microsoft.EntityFrameworkCore;

namespace BE_BTL_Mobile.Repositories;

public interface IUserRepository
{
    Task<NguoiDung?> FindAsync(string usernameOrEmail);
    Task<bool> ExistsAsync(string username, string email);
    Task AddAsync(NguoiDung user);
}

public class UserRepository(TodoDbContext db) : IUserRepository
{
    public Task<NguoiDung?> FindAsync(string value) => db.NguoiDungs.FirstOrDefaultAsync(x => x.TenDangNhap == value || x.Email == value);
    public Task<bool> ExistsAsync(string username, string email) => db.NguoiDungs.AnyAsync(x => x.TenDangNhap == username || x.Email == email);
    public async Task AddAsync(NguoiDung user) { db.NguoiDungs.Add(user); await db.SaveChangesAsync(); }
}

public interface ITaskRepository
{
    Task<List<CongViec>> GetByUserAsync(int userId);
    Task<CongViec?> GetOwnedAsync(int id, int userId);
    Task AddAsync(CongViec task);
    Task SaveAsync();
    void Remove(CongViec task);
}

public class TaskRepository(TodoDbContext db) : ITaskRepository
{
    public Task<List<CongViec>> GetByUserAsync(int userId) => db.CongViecs.AsNoTracking().Include(x => x.DanhMuc).Where(x => x.NguoiDungId == userId).OrderBy(x => x.HanHoanThanh).ToListAsync();
    public Task<CongViec?> GetOwnedAsync(int id, int userId) => db.CongViecs.FirstOrDefaultAsync(x => x.Id == id && x.NguoiDungId == userId);
    public async Task AddAsync(CongViec task) { db.CongViecs.Add(task); await db.SaveChangesAsync(); }
    public Task SaveAsync() => db.SaveChangesAsync();
    public void Remove(CongViec task) => db.CongViecs.Remove(task);
}

public interface IUserCrudRepository
{
    Task<List<NguoiDung>> GetAllAsync();
    Task<NguoiDung?> GetByIdAsync(int id);
    Task UpdateAsync(NguoiDung user);
    Task DeleteAsync(NguoiDung user);
    Task SaveAsync();
    void Remove(NguoiDung user);
}

public class UserCrudRepository(TodoDbContext db) : IUserCrudRepository
{
    public Task<List<NguoiDung>> GetAllAsync() => db.NguoiDungs.ToListAsync();
    public Task<NguoiDung?> GetByIdAsync(int id) => db.NguoiDungs.FirstOrDefaultAsync(x => x.Id == id);
    public async Task UpdateAsync(NguoiDung user) { db.NguoiDungs.Update(user); await db.SaveChangesAsync(); }
    public async Task DeleteAsync(NguoiDung user) { db.NguoiDungs.Remove(user); await db.SaveChangesAsync(); }
    public Task SaveAsync() => db.SaveChangesAsync();
    public void Remove(NguoiDung user) => db.NguoiDungs.Remove(user);
}

public interface ICategoryRepository
{
    Task<List<DanhMuc>> GetByUserAsync(int userId);
    Task<DanhMuc?> GetOwnedAsync(int id, int userId);
    Task AddAsync(DanhMuc category);
    Task SaveAsync();
    void Remove(DanhMuc category);
}

public class CategoryRepository(TodoDbContext db) : ICategoryRepository
{
    public Task<List<DanhMuc>> GetByUserAsync(int userId) => db.DanhMucs.AsNoTracking().Where(x => x.NguoiDungId == userId).OrderBy(x => x.TenDanhMuc).ToListAsync();
    public Task<DanhMuc?> GetOwnedAsync(int id, int userId) => db.DanhMucs.FirstOrDefaultAsync(x => x.Id == id && x.NguoiDungId == userId);
    public async Task AddAsync(DanhMuc category) { db.DanhMucs.Add(category); await db.SaveChangesAsync(); }
    public Task SaveAsync() => db.SaveChangesAsync();
    public void Remove(DanhMuc category) => db.DanhMucs.Remove(category);
}

public interface IReminderRepository
{
    Task<List<NhacNho>> GetByTaskAsync(int taskId);
    Task<NhacNho?> GetByIdAsync(int id);
    Task AddAsync(NhacNho reminder);
    Task SaveAsync();
    void Remove(NhacNho reminder);
}

public class ReminderRepository(TodoDbContext db) : IReminderRepository
{
    public Task<List<NhacNho>> GetByTaskAsync(int taskId) => db.NhacNhos.AsNoTracking().Where(x => x.CongViecId == taskId).ToListAsync();
    public Task<NhacNho?> GetByIdAsync(int id) => db.NhacNhos.FirstOrDefaultAsync(x => x.Id == id);
    public async Task AddAsync(NhacNho reminder) { db.NhacNhos.Add(reminder); await db.SaveChangesAsync(); }
    public Task SaveAsync() => db.SaveChangesAsync();
    public void Remove(NhacNho reminder) => db.NhacNhos.Remove(reminder);
}

public interface INotificationRepository
{
    Task<List<ThongBao>> GetByUserAsync(int userId);
    Task<ThongBao?> GetByIdAsync(int id);
    Task<ThongBao?> GetOwnedAsync(int id, int userId);
    Task AddAsync(ThongBao notification);
    Task SaveAsync();
    void Remove(ThongBao notification);
}

public class NotificationRepository(TodoDbContext db) : INotificationRepository
{
    public Task<List<ThongBao>> GetByUserAsync(int userId) => db.ThongBaos.AsNoTracking().Where(x => x.NguoiDungId == userId).OrderByDescending(x => x.NgayTao).ToListAsync();
    public Task<ThongBao?> GetByIdAsync(int id) => db.ThongBaos.FirstOrDefaultAsync(x => x.Id == id);
    public Task<ThongBao?> GetOwnedAsync(int id, int userId) => db.ThongBaos.FirstOrDefaultAsync(x => x.Id == id && x.NguoiDungId == userId);
    public async Task AddAsync(ThongBao notification) { db.ThongBaos.Add(notification); await db.SaveChangesAsync(); }
    public Task SaveAsync() => db.SaveChangesAsync();
    public void Remove(ThongBao notification) => db.ThongBaos.Remove(notification);
}

public interface ITaskHistoryRepository
{
    Task<List<LichSuCongViec>> GetByTaskAsync(int taskId);
    Task<LichSuCongViec?> GetByIdAsync(int id);
    Task AddAsync(LichSuCongViec history);
    Task SaveAsync();
    void Remove(LichSuCongViec history);
}

public class TaskHistoryRepository(TodoDbContext db) : ITaskHistoryRepository
{
    public Task<List<LichSuCongViec>> GetByTaskAsync(int taskId) => db.LichSuCongViecs.AsNoTracking().Where(x => x.CongViecId == taskId).OrderByDescending(x => x.ThoiGianThayDoi).ToListAsync();
    public Task<LichSuCongViec?> GetByIdAsync(int id) => db.LichSuCongViecs.FirstOrDefaultAsync(x => x.Id == id);
    public async Task AddAsync(LichSuCongViec history) { db.LichSuCongViecs.Add(history); await db.SaveChangesAsync(); }
    public Task SaveAsync() => db.SaveChangesAsync();
    public void Remove(LichSuCongViec history) => db.LichSuCongViecs.Remove(history);
}