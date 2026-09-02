using Pdks.Api.Data;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>Uygulama içi bildirim + isteğe bağlı SMS gönderimi.</summary>
public class NotificationService
{
    private readonly AppDbContext _db;
    private readonly ISmsSender _sms;
    private readonly ILogger<NotificationService> _log;

    public NotificationService(AppDbContext db, ISmsSender sms, ILogger<NotificationService> log)
    {
        _db = db; _sms = sms; _log = log;
    }

    /// <summary>
    /// Kullanıcıya bildirim gönderir. inApp true ise uygulama içi kayıt oluşturur;
    /// sms true ve telefon varsa SMS gönderir. SaveChanges çağırmaz (toplu kullanım için).
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
        }
        if (sms && !string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            try { await _sms.SendAsync(user.PhoneNumber!, $"{title}: {body}", ct); }
            catch (Exception ex) { _log.LogError(ex, "Bildirim SMS'i gönderilemedi ({User})", user.Id); }
        }
    }
}
