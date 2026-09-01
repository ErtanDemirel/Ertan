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

/// <summary>Mesai hareket tipi.</summary>
public enum AttendanceType
{
    CheckIn = 0,
    CheckOut = 1
}
