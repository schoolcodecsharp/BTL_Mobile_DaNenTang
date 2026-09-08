using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/tasks/{taskId:int}/history")]
public class TaskHistoryController(ITaskHistoryService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByTask(int taskId)
    {
        var history = await service.GetByTaskAsync(taskId);
        return Ok(history);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int taskId, int id)
    {
        var history = await service.GetByIdAsync(id);
        return history is not null ? Ok(history) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create(int taskId, TaskHistoryRequest request)
    {
        var history = await service.CreateAsync(request with { CongViecId = taskId });
        return CreatedAtAction(nameof(GetById), new { taskId, id = history.Id }, history);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int taskId, int id)
        => await service.DeleteAsync(id) ? NoContent() : NotFound();
}
