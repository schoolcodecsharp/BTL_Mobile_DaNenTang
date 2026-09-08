using BE_BTL_Mobile.Services;
using Microsoft.AspNetCore.Mvc;

namespace BE_BTL_Mobile.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IUserService service) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await service.RegisterAsync(request);
        return result.Success ? Ok(result.User) : BadRequest(new { message = result.Error });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await service.LoginAsync(request);
        return result.Success ? Ok(result.User) : Unauthorized(new { message = result.Error });
    }
}