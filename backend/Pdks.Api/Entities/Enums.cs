namespace Pdks.Api.Entities;

/// <summary>Kullanıcı yetki seviyeleri.</summary>
public enum UserRole
{
    /// <summary>Sistem yöneticisi - tüm yetkiler.</summary>
    Admin = 0,

    /// <summary>Amir / yönetici - izin onayı, duyuru, yemek girişi.</summary>
    Manager = 1,

    /// <summary>Standart personel - mobil uygulama kullanıcısı.</summary>
    Personnel = 2
}

/// <summary>İzin talebi durumları.</summary>
public enum LeaveStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3
}

/// <summary>Yarım gün izin dönemi. Yalnızca tek günlük izinlerde geçerlidir (0.5 gün sayılır).</summary>
public enum HalfDayPeriod
{
    /// <summary>Tam gün (varsayılan).</summary>
    None = 0,

    /// <summary>Öğleden önce (yarım gün).</summary>
    Morning = 1,

    /// <summary>Öğleden sonra (yarım gün).</summary>
    Afternoon = 2
}

/// <summary>Mesai hareket tipi.</summary>
public enum AttendanceType
{
    CheckIn = 0,
    CheckOut = 1
}

/// <summary>İş başvurusu / aday durumu.</summary>
public enum ApplicationStatus
{
    New = 0,
    Reviewing = 1,
    Interview = 2,
    Offered = 3,
    Hired = 4,
    Rejected = 5
}

/// <summary>Onay zinciri adımının onaylayanı hangi rolden.</summary>
public enum ApproverKind
{
    DepartmentManager = 0, // Bölüm/departman yöneticisi
    HrManager = 1,         // İK yöneticisi
    FactoryManager = 2,    // Fabrika müdürü
    SpecificPerson = 3     // Belirli bir kişi
}

/// <summary>Talep türü (onay zinciri bunların hepsinde çalışır).</summary>
public enum RequestKind
{
    Leave = 0,    // İzin
    Advance = 1,  // Avans
    Expense = 2   // Masraf / harcırah
}

/// <summary>Bir onay adımının durumu.</summary>
public enum StepStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Skipped = 3
}

/// <summary>Çalışan sesi / geri bildirim türü.</summary>
public enum FeedbackKind
{
    Suggestion = 0,  // Öneri
    Complaint = 1,   // Şikayet
    NearMiss = 2,    // Ramak kala (iş güvenliği)
    Request = 3      // Dilek / istek
}

/// <summary>Çalışan sesi kaydının durumu.</summary>
public enum FeedbackStatus
{
    New = 0,        // Yeni
    Reviewing = 1,  // İnceleniyor
    Resolved = 2,   // Çözüldü
    Closed = 3      // Kapatıldı
}
