using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(IUserCrudService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await service.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await service.GetByIdAsync(id);
        return user is not null ? Ok(user) : NotFound();
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UserUpdateRequest request)
        => await service.UpdateAsync(id, request) ? NoContent() : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => await service.DeleteAsync(id) ? NoContent() : NotFound();
}
