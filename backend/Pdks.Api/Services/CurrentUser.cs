using System.Security.Claims;

namespace Pdks.Api.Services;

/// <summary>JWT claim'lerinden aktif kullanıcı bilgilerine kolay erişim.</summary>
public static class ClaimsExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? user.FindFirstValue("sub");
        return int.TryParse(id, out var v) ? v : 0;
    }

    public static int? GetPersonnelId(this ClaimsPrincipal user)
    {
        var id = user.FindFirstValue("personnelId");
        return int.TryParse(id, out var v) ? v : null;
    }

    public static string GetRole(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.Role) ?? "Personnel";

    public static bool IsManagerOrAdmin(this ClaimsPrincipal user)
    {
        var r = user.GetRole();
        return r is "Admin" or "Manager";
    }
}
