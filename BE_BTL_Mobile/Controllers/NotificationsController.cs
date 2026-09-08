using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/users/{userId:int}/notifications")]
public class NotificationsController(INotificationService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByUser(int userId)
    {
        var notifications = await service.GetByUserAsync(userId);
        return Ok(notifications);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int userId, int id)
    {
        var notification = await service.GetByIdAsync(id, userId);
        return notification is not null ? Ok(notification) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create(int userId, NotificationRequest request)
    {
        var notification = await service.CreateAsync(request with { NguoiDungId = userId });
        return CreatedAtAction(nameof(GetById), new { userId, id = notification.Id }, notification);
    }

    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int userId, int id)
        => await service.MarkAsReadAsync(id, userId) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int userId, int id)
        => await service.DeleteAsync(id, userId) ? NoContent() : NotFound();
}
