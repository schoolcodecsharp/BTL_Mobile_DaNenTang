using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/users/{userId:int}/tasks")]
public class TasksController(ITaskService service) : ControllerBase
{
    [HttpGet]
    public Task<List<BE_BTL_Mobile.Entities.CongViec>> GetAll(int userId) => service.GetAllAsync(userId);

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int userId, int id) => (await service.GetAsync(id, userId)) is { } task ? Ok(task) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(int userId, TaskRequest request) => CreatedAtAction(nameof(Get), new { userId, id = (await service.CreateAsync(userId, request)).Id }, request);

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int userId, int id, TaskRequest request) => await service.UpdateAsync(id, userId, request) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int userId, int id) => await service.DeleteAsync(id, userId) ? NoContent() : NotFound();
}