using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>Uygulama içi bildirim + anlık (push) + isteğe bağlı SMS gönderimi.</summary>
public class NotificationService
{
    private readonly AppDbContext _db;
    private readonly ISmsSender _sms;
    private readonly IPushSender _push;
    private readonly ILogger<NotificationService> _log;

    public NotificationService(AppDbContext db, ISmsSender sms, IPushSender push,
        ILogger<NotificationService> log)
    {
        _db = db; _sms = sms; _push = push; _log = log;
    }

    /// <summary>
    /// Kullanıcıya bildirim gönderir. inApp true ise uygulama içi kayıt oluşturur VE
    /// kullanıcının kayıtlı cihazlarına push bildirimi iletir; sms true ve telefon varsa SMS gönderir.
    /// SaveChanges çağırmaz (toplu kullanım için).
    /// </summary>
    public async Task NotifyAsync(User user, string title, string body, string type,
        bool inApp, bool sms, CancellationToken ct = default)
    {
        if (inApp)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = user.Id,
                Title = title,
                Body = body,
                Type = type
            });

            // Kullanıcının aktif cihazlarına anlık push (best-effort; hata bildirimi engellemez).
            try
            {
                var tokens = await _db.PushTokens.AsNoTracking()
                    .Where(t => t.UserId == user.Id && t.IsActive)
                    .Select(t => t.Token)
                    .ToListAsync(ct);
                if (tokens.Count > 0)
                    await _push.SendAsync(tokens, title, body, type, ct);
            }
            catch (Exception ex) { _log.LogError(ex, "Push bildirimi gönderilemedi ({User})", user.Id); }
        }
        if (sms && !string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            try { await _sms.SendAsync(user.PhoneNumber!, $"{title}: {body}", ct); }
            catch (Exception ex) { _log.LogError(ex, "Bildirim SMS'i gönderilemedi ({User})", user.Id); }
        }
    }
}
