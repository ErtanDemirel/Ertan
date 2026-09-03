# Veritabanı Sürüm Yükseltmeleri (Migrations)

Bu klasör, **mevcut** bir veritabanını (veri kaybı olmadan) yeni sürüme taşıyan
artımlı SQL scriptlerini içerir. `database/schema.sql` ise sıfırdan kurulum içindir.

## Hangi yolu kullanmalıyım?

| Durum | Yöntem |
|-------|--------|
| Yeni/boş veritabanı | `schema.sql` (SQL-first) **veya** uygulama ilk açılışta `EnsureCreated()` |
| Mevcut veritabanını güncelleme (dev) | Uygulama açılışında **otomatik** — `DbMaintenance.ReconcileAsync` eksik kolon/tabloyu ekler |
| Mevcut veritabanını güncelleme (üretim, SQL-first) | Bu klasördeki `NNN_*.sql` scriptlerini sırayla çalıştırın |
| Üretim (kod-first, önerilen) | **EF Core migration** (aşağıya bakın) |

## EF Core migration'a geçiş (üretim için önerilen)

.NET SDK olan bir makinede:

```bash
cd backend/Pdks.Api
dotnet ef migrations add Initial     # ilk migration modelin tamamını üretir
dotnet ef database update            # veritabanına uygular
```

`Migrations/` klasörü oluştuğunda uygulama açılışta otomatik olarak
`db.Database.Migrate()` kullanır (bkz. `Program.cs`); migration yoksa hızlı
başlangıç için `EnsureCreated()` + `DbMaintenance` uyumlayıcı devreye girer.
Yeni bir alan/tablo ekledikçe `dotnet ef migrations add <Ad>` çalıştırıp
commit'leyin.

## Scriptler

Sırayla çalıştırın (yalnızca eksik olanları uygular; hepsi idempotent'e yakındır):

- `001_add_halfday_and_pushtokens.sql` — İzin yarım gün alanı + mobil push token tablosu.
