using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>Personelin kendine ait bilgileri görüntülediği self-servis uçları.</summary>
[ApiController]
[Route("api/me")]
[Authorize]
public class SelfServiceController : ControllerBase
{
    private readonly AppDbContext _db;
    public SelfServiceController(AppDbContext db) => _db = db;

    /// <summary>Personelin servis/güzergah bilgisi + tüm aktif güzergahların özeti.</summary>
    [HttpGet("service")]
    public async Task<ActionResult<object>> Service(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();

        object? mine = null;
        if (pid is not null)
        {
            var raw = await _db.Personnel.AsNoTracking()
                .Where(p => p.Id == pid)
                .Select(p => new
                {
                    routeName = p.ServiceRoute != null ? p.ServiceRoute.Name : null,
                    stop = p.ServiceStop,
                    departure = p.ServiceRoute != null ? p.ServiceRoute.DepartureTime : null,
                    ret = p.ServiceRoute != null ? p.ServiceRoute.ReturnTime : null,
                    driver = p.ServiceRoute != null ? p.ServiceRoute.DriverName : null,
                    plate = p.ServiceRoute != null ? p.ServiceRoute.PlateNumber : null,
                })
                .FirstOrDefaultAsync(ct);
            if (raw is not null)
                mine = new
                {
                    raw.routeName, raw.stop,
                    departure = raw.departure?.ToString("HH\\:mm"),
                    ret = raw.ret?.ToString("HH\\:mm"),
                    raw.driver, raw.plate,
                };
        }

        var rows = await _db.ServiceRoutes.AsNoTracking()
            .Where(r => r.IsActive).OrderBy(r => r.Name)
            .Select(r => new { r.Name, r.Stops, r.DepartureTime, r.ReturnTime })
            .ToListAsync(ct);
        var routes = rows.Select(r => new
        {
            r.Name, r.Stops,
            departure = r.DepartureTime?.ToString("HH\\:mm"),
            ret = r.ReturnTime?.ToString("HH\\:mm"),
        }).ToList();

        return Ok(new { mine, routes });
    }

    /// <summary>
    /// Şirket rehberi — aktif personelin ad, ünvan, departman ve iş telefonu.
    /// Hassas veri (TCKN, bordro, adres vb.) DÖNMEZ. Herhangi bir giriş yapmış kullanıcı görebilir.
    /// </summary>
    [HttpGet("directory")]
    public async Task<ActionResult<object>> Directory([FromQuery] string? search, CancellationToken ct)
    {
        var q = _db.Personnel.AsNoTracking().Where(p => p.IsActive);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(p => p.FirstName.Contains(s) || p.LastName.Contains(s)
                || (p.Title != null && p.Title.Contains(s))
                || (p.Department != null && p.Department.Contains(s)));
        }

        var rows = await q
            .OrderBy(p => p.FirstName).ThenBy(p => p.LastName)
            .Take(1000)
            .Select(p => new
            {
                name = p.FirstName + " " + p.LastName,
                title = p.Title,
                department = p.Dept != null ? p.Dept.Name : p.Department,
                phone = p.PhoneNumber,
                email = p.Email,
            })
            .ToListAsync(ct);

        return Ok(rows);
    }
}
