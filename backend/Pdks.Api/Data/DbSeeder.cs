using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Data;

/// <summary>İlk çalıştırmada örnek/başlangıç verilerini oluşturur.</summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, PasswordHasher hasher)
    {
        // ---- İzin türleri ----
        if (!await db.LeaveTypes.AnyAsync())
        {
            db.LeaveTypes.AddRange(
                new LeaveType { Name = "Yıllık İzin", DeductsFromAnnual = true, IsPaid = true },
                new LeaveType { Name = "Mazeret İzni", DeductsFromAnnual = false, IsPaid = true },
                new LeaveType { Name = "Ücretsiz İzin", DeductsFromAnnual = false, IsPaid = false },
                new LeaveType { Name = "Raporlu (İstirahat)", DeductsFromAnnual = false, IsPaid = true },
                new LeaveType { Name = "Evlilik İzni", DeductsFromAnnual = false, IsPaid = true },
                new LeaveType { Name = "Doğum İzni", DeductsFromAnnual = false, IsPaid = true }
            );
        }

        // ---- Vardiyalar ----
        if (!await db.Shifts.AnyAsync())
        {
            db.Shifts.AddRange(
                new Shift { Name = "Gündüz", StartTime = new(8, 0), EndTime = new(17, 0), Color = "#22c55e" },
                new Shift { Name = "Akşam", StartTime = new(16, 0), EndTime = new(0, 0), CrossesMidnight = true, Color = "#f59e0b" },
                new Shift { Name = "Gece", StartTime = new(0, 0), EndTime = new(8, 0), CrossesMidnight = true, Color = "#6366f1" }
            );
        }

        // ---- Servis güzergahları ----
        if (!await db.ServiceRoutes.AnyAsync())
        {
            db.ServiceRoutes.AddRange(
                new ServiceRoute { Name = "1 - Merkez Hattı", Stops = "Meydan, Belediye, Sanayi", DepartureTime = new(7, 0), ReturnTime = new(17, 30) },
                new ServiceRoute { Name = "2 - Sahil Hattı", Stops = "Liman, Sahil, Park", DepartureTime = new(7, 15), ReturnTime = new(17, 45) }
            );
        }

        // ---- İş yeri lokasyonu ----
        if (!await db.WorkLocations.AnyAsync())
        {
            db.WorkLocations.Add(new WorkLocation
            {
                Name = "Merkez Fabrika",
                Latitude = 41.015137,   // İstanbul örnek koordinat - kendi tesisinize göre değiştirin
                Longitude = 28.979530,
                RadiusMeters = 150,
                QrSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            });
        }

        await db.SaveChangesAsync();

        // ---- Yönetici (admin) hesabı ----
        if (!await db.Users.AnyAsync(u => u.Username == "admin"))
        {
            var (hash, salt) = hasher.Hash("Admin123!");
            db.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = hash,
                PasswordSalt = salt,
                Role = UserRole.Admin,
                PhoneNumber = "5550000000",
                Email = "admin@pdks.local"
            });
            await db.SaveChangesAsync();
        }

        // ---- Örnek amir + personel + hesapları ----
        if (!await db.Personnel.AnyAsync())
        {
            var dayShift = await db.Shifts.FirstAsync(s => s.Name == "Gündüz");
            var route1 = await db.ServiceRoutes.FirstAsync();

            var manager = new Personnel
            {
                SicilNo = "1001",
                FirstName = "Ayşe",
                LastName = "Yılmaz",
                Department = "Üretim",
                Title = "Vardiya Amiri",
                PhoneNumber = "5551112233",
                HireDate = new DateTime(2018, 3, 1),
                ShiftId = dayShift.Id,
                ServiceRouteId = route1.Id,
                ServiceStop = "Belediye"
            };
            db.Personnel.Add(manager);
            await db.SaveChangesAsync();

            var worker = new Personnel
            {
                SicilNo = "1002",
                FirstName = "Mehmet",
                LastName = "Demir",
                Department = "Üretim",
                Title = "Operatör",
                PhoneNumber = "5552223344",
                NationalId = "11111111111",
                HireDate = new DateTime(2021, 6, 15),
                ManagerId = manager.Id,
                ShiftId = dayShift.Id,
                ServiceRouteId = route1.Id,
                ServiceStop = "Meydan"
            };
            db.Personnel.Add(worker);

            // Eski (işten çıkmış) çalışan — aday eşleştirme demosu için
            var former = new Personnel
            {
                SicilNo = "0900",
                FirstName = "Kemal",
                LastName = "Aslan",
                Department = "Depo",
                Title = "Forklift Operatörü",
                NationalId = "22222222222",
                HireDate = new DateTime(2016, 2, 1),
                ExitDate = new DateTime(2019, 8, 31),
                ExitReason = "İstifa",
                IsActive = false,
                ServiceStop = "Sanayi"
            };
            db.Personnel.Add(former);
            await db.SaveChangesAsync();

            // Örnek iş başvuruları (biri eski çalışanla aynı TCKN)
            db.JobApplications.AddRange(
                new JobApplication
                {
                    FirstName = "Kemal", LastName = "Aslan", NationalId = "22222222222",
                    Phone = "5553334455", Position = "Depo Görevlisi",
                    Education = "Lise", ExperienceYears = 5,
                    PreviousWorkplace = "COKO-SİS (eski)", Status = ApplicationStatus.New
                },
                new JobApplication
                {
                    FirstName = "Elif", LastName = "Yıldız", NationalId = "33333333333",
                    Phone = "5554445566", Position = "Muhasebe Asistanı",
                    Education = "Üniversite", ExperienceYears = 2, Status = ApplicationStatus.New
                }
            );

            // Bakiyeler
            var year = DateTime.UtcNow.Year;
            db.LeaveBalances.AddRange(
                new LeaveBalance { PersonnelId = manager.Id, Year = year, EntitledDays = 20 },
                new LeaveBalance { PersonnelId = worker.Id, Year = year, EntitledDays = 14 }
            );

            // Hesaplar
            var (mHash, mSalt) = hasher.Hash("Amir123!");
            var (wHash, wSalt) = hasher.Hash("Personel123!");
            db.Users.AddRange(
                new User
                {
                    Username = "amir", PasswordHash = mHash, PasswordSalt = mSalt,
                    Role = UserRole.Manager, PersonnelId = manager.Id, PhoneNumber = manager.PhoneNumber
                },
                new User
                {
                    Username = "personel", PasswordHash = wHash, PasswordSalt = wSalt,
                    Role = UserRole.Personnel, PersonnelId = worker.Id, PhoneNumber = worker.PhoneNumber
                }
            );
            await db.SaveChangesAsync();
        }
    }
}
