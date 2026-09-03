# COKO-SİS — Personel Devam Kontrol Sistemi

Tam kapsamlı bir **PDKS** çözümü: ASP.NET Core Web API (SQL Server) arka uç, React + Tailwind
yönetim paneli ve Expo/React Native mobil uygulama.

> **Not:** Kullanıcıya görünen tüm adlar **COKO-SİS**'tir. Kod içindeki teknik ad alanı
> (`Pdks.Api`) geriye dönük uyumluluk için korunmuştur.

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

### v2 ile eklenen modüller

| Modül | Açıklama |
|-------|----------|
| **Sabit QR** | QR artık her seferinde değişmez; lokasyona özel **tek sefer üretilip yazdırılan** imzalı kod. Güvenlik konum (geofence) + gerektiğinde anahtar yenileme ile sağlanır. |
| **Bordro dağıtımı** | Yalnızca **bordro sorumlusu** yükler/dağıtır; personel web/mobil'den **kendi (dağıtılmış) bordrosunu** görüp indirir. **Çok sayfalı tek PDF'i TC'ye göre otomatik ayırıp** kişilere atar (eşleşmeyen sayfalar listelenir). Örnek dosya: `database/samples/ornek-bordro-cok-sayfa.pdf`. |
| **Gelişmiş izin talebi** | Başlık, tür, tarih, **kullanılan gün** ve **dosya eki** (rapor/foto/PDF). **Tek günlük izinlerde yarım gün** (öğleden önce / öğleden sonra → 0,5 gün) seçilebilir. Onaylı izinler için **otomatik dolan Word izin belgesi** üretilir (`Templates/izin_belgesi_template.docx`, yer tutucuları kendi belgenizle değiştirin; `{{YarimGun}}` yer tutucusu eklendi). |
| **Personel self-servis (web)** | Personel de web'e girip izin talebi açar, duyuru/yemek/bordro/servis bilgisini görür (`/me/*`). |
| **İş başvurusu + Aday yönetimi** | Kamuya açık başvuru formu (`/basvuru`), İK aday listesi/detayı; **TCKN ile geçmiş çalışan eşleştirmesi** (daha önce çalıştı mı, ne kadar, çıkış yaptı mı). |
| **Servis analizi** | Vardiya bazlı: güzergah başına kişi sayısı, kapasiteye göre **gerekli servis sayısı**, **durak bazında** kişi dağılımı. |
| **Güvenlik sertleştirmesi** | Hesap kilidi (brute-force), giriş uçlarında rate limiting, şifre politikası, güvenlik başlıkları, denetim kaydı (audit log), yapılandırılabilir CORS, güvenli dosya yükleme (tür/boyut doğrulama, webroot dışında saklama). |
| **Anlık (push) bildirim** | Mobil cihazlar **Expo Push** ile bildirim alır (bordro hazır, izin/onay sonucu, onay bekleyen talep). Uygulama-içi bildirim oluştukça kullanıcının kayıtlı cihazlarına da push gönderilir. `Push:Provider` = `Expo` (varsayılan) / `None`. |
| **Raporlar (CSV)** | Amir/Admin için **Excel'de açılan CSV** çıktıları: personel listesi, izin talepleri (yarım gün dahil, tarih/durum filtreli), mesai giriş/çıkış, yıllık izin bakiyeleri. Bordro gibi hassas veriler raporlara **dahil edilmez**. |
| **Çalışan Sesi** | Personel **öneri / şikayet / ramak kala (iş güvenliği) / dilek** gönderir (isteğe bağlı **anonim**); Amir/Admin görüntüler, durum (Yeni→İnceleniyor→Çözüldü) ve yanıt yazar. Web + mobil. |
| **Şirket rehberi & Mesai geçmişim** | Web self-servis ve mobilde: çalışan dizini (ara, telefon/e-posta) ve kişinin kendi mesai giriş/çıkış geçmişi + aylık özet. |
| **Hesaplama araçları** | Web + mobil, saf istemci: **fazla mesai** (%25/%50/%100 zam) ve **kıdem/ihbar tazminatı** (brüt tahmini). |
| **İletişim & acil durum güncelleme** | Personel telefon/e-posta/adres + **acil durum kişisi**ni günceller; **İK/amir onayından** sonra karta işlenir. Web + mobil. |
| **Devamlılık / Çalışma takvimim** | Aylık **ısı haritası** (geldi/izinli/gelmedi/tatil/hafta sonu) + **devamlılık %** (web'de halka grafiği). Mesai + tatil + onaylı izin verisinden hesaplanır. Web + mobil. |
| **Eğitim (video)** | İK/İSG video yükler; personel **ileri saramadan** izler, **kaldığı yerden devam eder** (ilerleme sunucuda saklanır, sıfırlanmaz). Bitince **"Aldığım eğitimler"**e geçer. Yetkililer **izlenme oranlarını** panelden takip eder. Video, range destekli akışla (token query'de) servis edilir. Web + mobil. |
| **İç ilanlar** | Yetkililer iç ilan açar; personel uygulamadan **başvurur**; İK başvuruları **değerlendirir** (Yeni→İnceleniyor→Görüşme→Teklif→Alındı/Reddedildi). Web (yönetici + self) + mobil. |
| **Güvenli şema güncelleme** | `EnsureCreated` + idempotent `DbMaintenance` uyumlayıcı: mevcut veritabanı veri kaybı olmadan yeni kolon/tablo alır. Üretim için EF Core migration'a hazır (bkz. `database/migrations/`). |

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

**Push bildirim**: Varsayılan `Push:Provider = "Expo"` (Expo Push servisi; ek altyapı gerektirmez).
Push'u kapatmak için `Push:Provider = "None"`. Mobil uygulama girişte cihaz token'ını
`POST /api/notifications/register-device` ile kaydeder; çıkışta kaydı kaldırır. Gerçek push için
uygulamayı bir **EAS projesiyle** (development/production build) çalıştırın — Expo Go emülatörde token vermez.

> **Şema güncelleme**: Model yeni kolon/tablo kazandığında, mevcut veritabanı açılışta
> `DbMaintenance` uyumlayıcısıyla güvenli şekilde güncellenir (veri kaybı olmadan). Üretimde
> EF migration önerilir: `Migrations/` klasörü oluşturunca uygulama otomatik `Migrate()` kullanır.
> Ayrıntı: `database/migrations/README.md`.

**Demo hesaplar**:

| Kullanıcı | Şifre        | Rol / Yetki |
|-----------|--------------|-------------|
| admin     | Admin123!    | Yönetici    |
| amir      | Amir123!     | Amir (Üretim bölüm yöneticisi) |
| ik        | Ik123456!    | İK Yöneticisi (onay zinciri) |
| mudur     | Mudur123!    | Fabrika Müdürü (onay zinciri) |
| bordro    | Bordro123!   | Bordro Sorumlusu (bordro yükle/dağıt) |
| personel  | Personel123! | Personel    |

> **Onay zinciri (demo):** `personel` bir izin/avans/masraf talebi açtığında sırasıyla
> **amir (Bölüm Yöneticisi) → ik (İK) → mudur (Fabrika Müdürü, bilgi)** onayına düşer.
> Zincir departman bazlıdır; "Onay Zinciri" ekranından adım ekleyip sıralayabilirsiniz.

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
2. `Kiosk QR Göster` ile lokasyona özel **sabit** QR üretilir; bir kez yazdırıp iş yerine asmak yeterlidir.
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
