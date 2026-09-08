using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/users/{userId:int}/categories")]
public class CategoriesController(ICategoryService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(int userId)
    {
        var categories = await service.GetAllAsync(userId);
        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int userId, int id)
    {
        var category = await service.GetByIdAsync(id, userId);
        return category is not null ? Ok(category) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create(int userId, CategoryRequest request)
    {
        var category = await service.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { userId, id = category.Id }, category);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int userId, int id, CategoryRequest request)
        => await service.UpdateAsync(id, userId, request) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int userId, int id)
        => await service.DeleteAsync(id, userId) ? NoContent() : NotFound();
}