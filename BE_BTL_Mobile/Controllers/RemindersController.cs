using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/tasks/{taskId:int}/reminders")]
public class RemindersController(IReminderService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByTask(int taskId)
    {
        var reminders = await service.GetByTaskAsync(taskId);
        return Ok(reminders);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int taskId, int id)
    {
        var reminder = await service.GetByIdAsync(id);
        return reminder is not null ? Ok(reminder) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create(int taskId, ReminderRequest request)
    {
        var reminder = await service.CreateAsync(request with { CongViecId = taskId });
        return CreatedAtAction(nameof(GetById), new { taskId, id = reminder.Id }, reminder);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int taskId, int id, ReminderRequest request)
        => await service.UpdateAsync(id, request with { CongViecId = taskId }) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int taskId, int id)
        => await service.DeleteAsync(id) ? NoContent() : NotFound();
}
