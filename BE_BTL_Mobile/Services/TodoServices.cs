using BE_BTL_Mobile.Entities;
using BE_BTL_Mobile.Repositories;
using Microsoft.EntityFrameworkCore;

namespace BE_BTL_Mobile.Services;

public record RegisterRequest(string Username, string Email, string Password, string? FullName);
public record LoginRequest(string UsernameOrEmail, string Password);
public record UserResponse(int Id, string Username, string Email, string? FullName);
public record TaskRequest(string Title, string? Description, MucDoUuTien Priority, TrangThaiCongViec Status, int? CategoryId, DateTime? StartDate, DateTime? DueDate);
public record CategoryRequest(string Name, string? Description, string? Color);
public record UserUpdateRequest(string? FullName, string? Email, string? AvatarUrl);
public record ReminderRequest(int CongViecId, DateTime ThoiGianNhac, LoaiNhac LoaiNhac);
public record NotificationRequest(int NguoiDungId, int? CongViecId, string TieuDe, string? NoiDung);
public record TaskHistoryRequest(int CongViecId, string? TrangThaiCu, string? TrangThaiMoi);

public interface IUserService
{
    Task<(bool Success, string? Error, UserResponse? User)> RegisterAsync(RegisterRequest request);
    Task<(bool Success, string? Error, UserResponse? User)> LoginAsync(LoginRequest request);
}

public class UserService(IUserRepository repository) : IUserService
{
    public async Task<(bool Success, string? Error, UserResponse? User)> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password)) return (false, "Username, email and password are required.", null);
        if (await repository.ExistsAsync(request.Username, request.Email)) return (false, "Username or email already exists.", null);
        var user = new NguoiDung { TenDangNhap = request.Username, Email = request.Email, MatKhau = BCrypt.Net.BCrypt.HashPassword(request.Password), HoTen = request.FullName, NgayTao = DateTime.UtcNow, TrangThai = true };
        await repository.AddAsync(user);
        return (true, null, ToResponse(user));
    }

    public async Task<(bool Success, string? Error, UserResponse? User)> LoginAsync(LoginRequest request)
    {
        var user = await repository.FindAsync(request.UsernameOrEmail);
        if (user is null || !user.TrangThai || !BCrypt.Net.BCrypt.Verify(request.Password, user.MatKhau)) return (false, "Invalid credentials.", null);
        return (true, null, ToResponse(user));
    }

    private static UserResponse ToResponse(NguoiDung user) => new(user.Id, user.TenDangNhap, user.Email, user.HoTen);
}

public interface ITaskService
{
    Task<List<CongViec>> GetAllAsync(int userId);
    Task<CongViec?> GetAsync(int id, int userId);
    Task<CongViec> CreateAsync(int userId, TaskRequest request);
    Task<bool> UpdateAsync(int id, int userId, TaskRequest request);
    Task<bool> DeleteAsync(int id, int userId);
}

public class TaskService(ITaskRepository repository) : ITaskService
{
    public Task<List<CongViec>> GetAllAsync(int userId) => repository.GetByUserAsync(userId);
    public Task<CongViec?> GetAsync(int id, int userId) => repository.GetOwnedAsync(id, userId);
    public async Task<CongViec> CreateAsync(int userId, TaskRequest request)
    {
        var task = new CongViec { NguoiDungId = userId, TieuDe = request.Title, MoTa = request.Description, MucDoUuTien = request.Priority, TrangThai = request.Status, DanhMucId = request.CategoryId, NgayBatDau = request.StartDate, HanHoanThanh = request.DueDate, NgayTao = DateTime.UtcNow, NgayCapNhat = DateTime.UtcNow, NgayHoanThanh = request.Status == TrangThaiCongViec.HOAN_THANH ? DateTime.UtcNow : null };
        await repository.AddAsync(task);
        return task;
    }
    public async Task<bool> UpdateAsync(int id, int userId, TaskRequest request)
    {
        var task = await repository.GetOwnedAsync(id, userId);
        if (task is null) return false;
        task.TieuDe = request.Title; task.MoTa = request.Description; task.MucDoUuTien = request.Priority; task.TrangThai = request.Status; task.DanhMucId = request.CategoryId; task.NgayBatDau = request.StartDate; task.HanHoanThanh = request.DueDate; task.NgayHoanThanh = request.Status == TrangThaiCongViec.HOAN_THANH ? task.NgayHoanThanh ?? DateTime.UtcNow : null;
        await repository.SaveAsync(); return true;
    }
    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var task = await repository.GetOwnedAsync(id, userId); if (task is null) return false; repository.Remove(task); await repository.SaveAsync(); return true;
    }
}

public interface ICategoryService
{
    Task<List<DanhMuc>> GetAllAsync(int userId);
    Task<DanhMuc?> GetByIdAsync(int id, int userId);
    Task<DanhMuc> CreateAsync(int userId, CategoryRequest request);
    Task<bool> UpdateAsync(int id, int userId, CategoryRequest request);
    Task<bool> DeleteAsync(int id, int userId);
}

public class CategoryService(ICategoryRepository repository) : ICategoryService
{
    public Task<List<DanhMuc>> GetAllAsync(int userId) => repository.GetByUserAsync(userId);
    public Task<DanhMuc?> GetByIdAsync(int id, int userId) => repository.GetOwnedAsync(id, userId);
    public async Task<DanhMuc> CreateAsync(int userId, CategoryRequest request)
    {
        var category = new DanhMuc { NguoiDungId = userId, TenDanhMuc = request.Name, MoTa = request.Description, MauSac = request.Color };
        await repository.AddAsync(category); return category;
    }
    public async Task<bool> UpdateAsync(int id, int userId, CategoryRequest request)
    {
        var category = await repository.GetOwnedAsync(id, userId);
        if (category is null) return false;
        category.TenDanhMuc = request.Name; category.MoTa = request.Description; category.MauSac = request.Color;
        await repository.SaveAsync(); return true;
    }
    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var category = await repository.GetOwnedAsync(id, userId);
        if (category is null) return false;
        repository.Remove(category); await repository.SaveAsync(); return true;
    }
}

public interface IUserCrudService
{
    Task<List<UserResponse>> GetAllAsync();
    Task<UserResponse?> GetByIdAsync(int id);
    Task<bool> UpdateAsync(int id, UserUpdateRequest request);
    Task<bool> DeleteAsync(int id);
}

public class UserCrudService(IUserCrudRepository repository) : IUserCrudService
{
    public async Task<List<UserResponse>> GetAllAsync()
    {
        var users = await repository.GetAllAsync();
        return users.Select(u => new UserResponse(u.Id, u.TenDangNhap, u.Email, u.HoTen)).ToList();
    }
    public async Task<UserResponse?> GetByIdAsync(int id)
    {
        var user = await repository.GetByIdAsync(id);
        if (user is null) return null;
        return new UserResponse(user.Id, user.TenDangNhap, user.Email, user.HoTen);
    }
    public async Task<bool> UpdateAsync(int id, UserUpdateRequest request)
    {
        var user = await repository.GetByIdAsync(id);
        if (user is null) return false;
        if (request.FullName is not null) user.HoTen = request.FullName;
        if (request.Email is not null) user.Email = request.Email;
        if (request.AvatarUrl is not null) user.AnhDaiDien = request.AvatarUrl;
        await repository.SaveAsync(); return true;
    }
    public async Task<bool> DeleteAsync(int id)
    {
        var user = await repository.GetByIdAsync(id);
        if (user is null) return false;
        repository.Remove(user); await repository.SaveAsync(); return true;
    }
}

public interface IReminderService
{
    Task<List<NhacNho>> GetByTaskAsync(int taskId);
    Task<NhacNho?> GetByIdAsync(int id);
    Task<NhacNho> CreateAsync(ReminderRequest request);
    Task<bool> UpdateAsync(int id, ReminderRequest request);
    Task<bool> DeleteAsync(int id);
}

public class ReminderService(IReminderRepository repository) : IReminderService
{
    public Task<List<NhacNho>> GetByTaskAsync(int taskId) => repository.GetByTaskAsync(taskId);
    public Task<NhacNho?> GetByIdAsync(int id) => repository.GetByIdAsync(id);
    public async Task<NhacNho> CreateAsync(ReminderRequest request)
    {
        var reminder = new NhacNho { CongViecId = request.CongViecId, ThoiGianNhac = request.ThoiGianNhac, LoaiNhac = request.LoaiNhac, DaGui = false };
        await repository.AddAsync(reminder); return reminder;
    }
    public async Task<bool> UpdateAsync(int id, ReminderRequest request)
    {
        var reminder = await repository.GetByIdAsync(id);
        if (reminder is null) return false;
        reminder.CongViecId = request.CongViecId; reminder.ThoiGianNhac = request.ThoiGianNhac; reminder.LoaiNhac = request.LoaiNhac;
        await repository.SaveAsync(); return true;
    }
    public async Task<bool> DeleteAsync(int id)
    {
        var reminder = await repository.GetByIdAsync(id);
        if (reminder is null) return false;
        repository.Remove(reminder); await repository.SaveAsync(); return true;
    }
}

public interface INotificationService
{
    Task<List<ThongBao>> GetByUserAsync(int userId);
    Task<ThongBao?> GetByIdAsync(int id, int userId);
    Task<ThongBao> CreateAsync(NotificationRequest request);
    Task<bool> MarkAsReadAsync(int id, int userId);
    Task<bool> DeleteAsync(int id, int userId);
}

public class NotificationService(INotificationRepository repository) : INotificationService
{
    public Task<List<ThongBao>> GetByUserAsync(int userId) => repository.GetByUserAsync(userId);
    public Task<ThongBao?> GetByIdAsync(int id, int userId) => repository.GetOwnedAsync(id, userId);
    public async Task<ThongBao> CreateAsync(NotificationRequest request)
    {
        var notif = new ThongBao { NguoiDungId = request.NguoiDungId, CongViecId = request.CongViecId, TieuDe = request.TieuDe, NoiDung = request.NoiDung, NgayTao = DateTime.UtcNow, DaDoc = false };
        await repository.AddAsync(notif); return notif;
    }
    public async Task<bool> MarkAsReadAsync(int id, int userId)
    {
        var notif = await repository.GetOwnedAsync(id, userId);
        if (notif is null) return false;
        notif.DaDoc = true; await repository.SaveAsync(); return true;
    }
    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var notif = await repository.GetOwnedAsync(id, userId);
        if (notif is null) return false;
        repository.Remove(notif); await repository.SaveAsync(); return true;
    }
}

public interface ITaskHistoryService
{
    Task<List<LichSuCongViec>> GetByTaskAsync(int taskId);
    Task<LichSuCongViec?> GetByIdAsync(int id);
    Task<LichSuCongViec> CreateAsync(TaskHistoryRequest request);
    Task<bool> DeleteAsync(int id);
}

public class TaskHistoryService(ITaskHistoryRepository repository) : ITaskHistoryService
{
    public Task<List<LichSuCongViec>> GetByTaskAsync(int taskId) => repository.GetByTaskAsync(taskId);
    public Task<LichSuCongViec?> GetByIdAsync(int id) => repository.GetByIdAsync(id);
    public async Task<LichSuCongViec> CreateAsync(TaskHistoryRequest request)
    {
        var history = new LichSuCongViec { CongViecId = request.CongViecId, TrangThaiCu = request.TrangThaiCu, TrangThaiMoi = request.TrangThaiMoi, ThoiGianThayDoi = DateTime.UtcNow };
        await repository.AddAsync(history); return history;
    }
    public async Task<bool> DeleteAsync(int id)
    {
        var history = await repository.GetByIdAsync(id);
        if (history is null) return false;
        repository.Remove(history); await repository.SaveAsync(); return true;
    }
}