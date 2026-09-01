# PDKS — Personel Devam Kontrol Sistemi

Tam kapsamlı bir **PDKS** çözümü: ASP.NET Core Web API (SQL Server) arka uç, React + Tailwind
yönetim paneli ve Expo/React Native mobil uygulama.

```
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│   Web Paneli       │     │  Mobil Uygulama    │     │   Kiosk Ekranı     │
│ React + Vite +     │     │  Expo / RN         │     │ (dönen QR kod)     │
│ Tailwind (Amir)    │     │  (Personel)        │     │                    │
└─────────┬──────────┘     └─────────┬──────────┘     └─────────┬──────────┘
          │  REST + JWT              │                          │
          └──────────────┬──────────┴──────────────────────────┘
                         ▼
              ┌──────────────────────┐
              │  ASP.NET Core 8 API  │  JWT, PBKDF2, SMS OTP, Geofence
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  SQL Server (EF Core) │
              └──────────────────────┘
```

## Klasör Yapısı

| Klasör       | İçerik                                                        |
|--------------|--------------------------------------------------------------|
| `backend/`   | ASP.NET Core 8 Web API + EF Core (SQL Server / Sqlite)       |
| `web/`       | React + Vite + TypeScript + Tailwind yönetim paneli          |
| `mobile/`    | Expo (React Native) personel mobil uygulaması                |
| `database/`  | SQL Server şema scripti (SQL-first kurulum için)             |

---

## İstenen Özellikler ve Karşılıkları

| İstek | Karşılık |
|-------|----------|
| Giriş ekranı (kullanıcı adı / şifre) | `AuthController.Login`, web `Login`, mobil `LoginScreen` |
| Yetki ve şifre kontrolü, sunucuda şifreli/güvenli | JWT + rol bazlı yetki, **PBKDF2-HMAC-SHA256** (210k iterasyon) hash + salt |
| Şifre sıfırlamada SMS'e tek kullanımlık kod | `forgot-password` / `reset-password` + `ISmsSender` (Console/Netgsm), OTP hash'li, süreli, denemesi sınırlı |
| Personel kayıt (sicil no, servis güzergahı) | `PersonnelController`, `ServiceRouteController` |
| Personel yönetimi (ekle/düzenle/sil/ara/filtrele) | Web `Personnel` — React + Tailwind tablo, arama & filtre & sayfalama |
| Vardiya yönetimi | `ShiftController` + vardiya planı (atamalar) |
| İzin yönetimi, yıllık izin, amir onayı, bakiyeden düşme | `LeaveController` + `LeaveService` (rezervasyon → onayda düşüm) |
| İzinlerin vardiya yönetiminden görünmesi | `GET /api/shifts/assignments` onaylı izinleri birlikte döner |
| Mobil izin talebi | `LeaveScreen` |
| Duyurular + zorunlu "Okudum" (basmadan çıkamama) | `AnnouncementController` + mobil `MandatoryGate` (kapatılamayan modal) |
| Yemek listesi (yetkili girer, personel görür) | `MealController`, web `Meals`, mobil `MealsScreen` |
| Konuma bağlı QR ile mesai giriş/çıkış (evden giriş engeli) | `AttendanceController.Check` — **geofence (Haversine)** + **zamana bağlı QR (TOTP benzeri)** |

### Eklediğim "olmazsa olmaz" güvenlik/işlevsellik

- **Rotasyonlu QR kod**: Kiosk ekranındaki kod 30 sn'de bir değişir → ekran görüntüsüyle
  uzaktan giriş engellenir (konum kontrolüne ek ikinci katman).
- **Refresh token** ile oturum yenileme; şifre değişince tüm oturumlar iptal.
- **OTP güvenliği**: kod hash'li saklanır, süreli (5 dk), deneme sayısı sınırlı (5), kullanıcı sayımı ifşa edilmez.
- **Rol bazlı yetki**: Admin / Amir (Manager) / Personel.
- **Geofence denetim kaydı**: her mesai hareketinde mesafe ve alan içi/dışı bilgisi loglanır.
- **Sicil no ve kullanıcı adı benzersizliği**, izin çakışma kontrolü, yetersiz bakiye kontrolü.

---

## Kurulum

### 1) Backend (ASP.NET Core 8)

Gereksinim: [.NET 8 SDK](https://dotnet.microsoft.com/download).

```bash
cd backend/Pdks.Api
dotnet restore
dotnet run
```

- Swagger: `http://localhost:5080/swagger`
- İlk çalıştırmada şema oluşturulur ve örnek veriler eklenir (`DbSeeder`).

**Veritabanı seçimi** (`appsettings*.json` → `Database:Provider`):
- `SqlServer` (varsayılan) — `ConnectionStrings:Default` bağlantı cümlesini ayarlayın.
- `Sqlite` — SQL Server kurmadan hızlı deneme (`Development` ortamında varsayılan `pdks.db`).

> Not: Hızlı başlangıç için `EnsureCreated()` kullanılır. Üretimde EF Core migration'a geçin:
> `dotnet ef migrations add Init && dotnet ef database update`. SQL-first kurulum için
> `database/schema.sql` scriptini kullanabilirsiniz.

**SMS sağlayıcısı**: Geliştirmede `Sms:Provider = "Console"` (OTP log'a yazılır).
Üretimde `Netgsm` seçip `Sms` bölümünü doldurun (veya `NetgsmSmsSender`'ı kendi sağlayıcınıza uyarlayın).

**Demo hesaplar**:

| Kullanıcı | Şifre        | Rol      |
|-----------|--------------|----------|
| admin     | Admin123!    | Yönetici |
| amir      | Amir123!     | Amir     |
| personel  | Personel123! | Personel |

### 2) Web Paneli (React)

```bash
cd web
npm install
cp .env.example .env   # VITE_API_URL'i backend adresinize göre ayarlayın
npm run dev            # http://localhost:5173
```

> `.env` boş bırakılırsa Vite `/api` isteklerini `http://localhost:5080`'e proxy'ler.
> Web paneline yalnızca **Admin/Amir** rolleri girebilir.

### 3) Mobil Uygulama (Expo)

```bash
cd mobile
npm install
npx expo start
```

- API adresi `app.json → expo.extra.apiUrl` alanından okunur.
  - Android emülatör: `http://10.0.2.2:5080`
  - iOS simülatör: `http://localhost:5080`
  - Gerçek cihaz: bilgisayarınızın LAN IP'si (örn. `http://192.168.1.20:5080`)
- Kamera ve konum izinleri QR mesai özelliği için gereklidir.

---

## QR + Konumlu Mesai Akışı

1. Yönetici, **Lokasyon & QR** ekranından iş yeri koordinatı ve yarıçapını tanımlar.
2. İş yerindeki bir ekran (kiosk) `Kiosk QR Göster` ile **her 30 sn'de yenilenen** QR'ı gösterir.
3. Personel mobil uygulamada QR'ı okutur; uygulama **anlık GPS konumunu** sunucuya gönderir.
4. Sunucu: (a) QR kodun zaman geçerliliğini, (b) konumun yarıçap içinde olduğunu doğrular.
   Konum alan dışındaysa (örn. evden) **kayıt reddedilir**.
5. Bugünkü son harekete göre otomatik **giriş / çıkış** belirlenir.

---

## Güvenlik Notları (üretim öncesi)

- `Jwt:Key` değerini güçlü, gizli bir anahtarla değiştirin (env / secret manager).
- Backend'i HTTPS arkasında yayınlayın; CORS politikasını gerçek origin'lerle sınırlayın.
- SMS sağlayıcı kimlik bilgilerini `appsettings` yerine ortam değişkeni/secret ile verin.
- Üretimde EF migration kullanın; `EnsureCreated` yalnızca hızlı başlangıç içindir.
