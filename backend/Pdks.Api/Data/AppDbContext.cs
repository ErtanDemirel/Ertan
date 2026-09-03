using Microsoft.EntityFrameworkCore;
using Pdks.Api.Entities;

namespace Pdks.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Personnel> Personnel => Set<Personnel>();
    public DbSet<ServiceRoute> ServiceRoutes => Set<ServiceRoute>();
    public DbSet<Shift> Shifts => Set<Shift>();
    public DbSet<ShiftAssignment> ShiftAssignments => Set<ShiftAssignment>();
    public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
    public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<AnnouncementRead> AnnouncementReads => Set<AnnouncementRead>();
    public DbSet<MealMenu> MealMenus => Set<MealMenu>();
    public DbSet<WorkLocation> WorkLocations => Set<WorkLocation>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<PasswordResetCode> PasswordResetCodes => Set<PasswordResetCode>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<LeaveAttachment> LeaveAttachments => Set<LeaveAttachment>();
    public DbSet<Payslip> Payslips => Set<Payslip>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<ApprovalStepTemplate> ApprovalStepTemplates => Set<ApprovalStepTemplate>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();
    public DbSet<ApprovalStep> ApprovalSteps => Set<ApprovalStep>();
    public DbSet<AdvanceRequest> AdvanceRequests => Set<AdvanceRequest>();
    public DbSet<ExpenseRequest> ExpenseRequests => Set<ExpenseRequest>();
    public DbSet<FeedbackItem> FeedbackItems => Set<FeedbackItem>();
    public DbSet<ContactUpdateRequest> ContactUpdateRequests => Set<ContactUpdateRequest>();
    public DbSet<Training> Trainings => Set<Training>();
    public DbSet<TrainingProgress> TrainingProgresses => Set<TrainingProgress>();
    public DbSet<InternalPosting> InternalPostings => Set<InternalPosting>();
    public DbSet<InternalApplication> InternalApplications => Set<InternalApplication>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // ---- User ----
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Username).IsUnique();
            e.HasOne(x => x.Personnel)
                .WithMany()
                .HasForeignKey(x => x.PersonnelId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ---- Personnel ----
        b.Entity<Personnel>(e =>
        {
            e.HasIndex(x => x.SicilNo).IsUnique();
            e.Ignore(x => x.FullName);

            e.HasOne(x => x.Manager)
                .WithMany(x => x.Subordinates)
                .HasForeignKey(x => x.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.ServiceRoute)
                .WithMany(x => x.Personnel)
                .HasForeignKey(x => x.ServiceRouteId)
                .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(x => x.Shift)
                .WithMany(x => x.Personnel)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ---- ShiftAssignment ----
        b.Entity<ShiftAssignment>(e =>
        {
            e.HasIndex(x => new { x.PersonnelId, x.Date });
            e.HasOne(x => x.Personnel)
                .WithMany(x => x.ShiftAssignments)
                .HasForeignKey(x => x.PersonnelId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Shift)
                .WithMany(x => x.Assignments)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- LeaveBalance ----
        b.Entity<LeaveBalance>(e =>
        {
            e.Ignore(x => x.RemainingDays);
            e.HasIndex(x => new { x.PersonnelId, x.Year }).IsUnique();
            e.Property(x => x.EntitledDays).HasPrecision(6, 2);
            e.Property(x => x.UsedDays).HasPrecision(6, 2);
            e.Property(x => x.PendingDays).HasPrecision(6, 2);
            e.HasOne(x => x.Personnel)
                .WithMany(x => x.LeaveBalances)
                .HasForeignKey(x => x.PersonnelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- LeaveRequest ----
        b.Entity<LeaveRequest>(e =>
        {
            e.Property(x => x.TotalDays).HasPrecision(6, 2);
            e.HasOne(x => x.Personnel)
                .WithMany(x => x.LeaveRequests)
                .HasForeignKey(x => x.PersonnelId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.LeaveType)
                .WithMany(x => x.Requests)
                .HasForeignKey(x => x.LeaveTypeId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Approver)
                .WithMany()
                .HasForeignKey(x => x.ApproverId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Announcement ----
        b.Entity<Announcement>(e =>
        {
            e.HasOne(x => x.PublishedBy)
                .WithMany()
                .HasForeignKey(x => x.PublishedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<AnnouncementRead>(e =>
        {
            e.HasIndex(x => new { x.AnnouncementId, x.UserId }).IsUnique();
            e.HasOne(x => x.Announcement)
                .WithMany(x => x.Reads)
                .HasForeignKey(x => x.AnnouncementId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- MealMenu ----
        b.Entity<MealMenu>(e =>
        {
            e.HasIndex(x => x.Date).IsUnique();
            e.HasOne(x => x.CreatedBy)
                .WithMany()
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Attendance ----
        b.Entity<Attendance>(e =>
        {
            e.HasIndex(x => new { x.PersonnelId, x.Timestamp });
            e.HasOne(x => x.Personnel)
                .WithMany(x => x.Attendances)
                .HasForeignKey(x => x.PersonnelId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.WorkLocation)
                .WithMany(x => x.Attendances)
                .HasForeignKey(x => x.WorkLocationId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ---- Security ----
        b.Entity<PasswordResetCode>(e =>
        {
            e.HasOne(x => x.User)
                .WithMany(x => x.ResetCodes)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<RefreshToken>(e =>
        {
            e.HasIndex(x => x.Token);
            e.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- LeaveAttachment ----
        b.Entity<LeaveAttachment>(e =>
        {
            e.HasOne(x => x.LeaveRequest)
                .WithMany(x => x.Attachments)
                .HasForeignKey(x => x.LeaveRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Payslip ----
        b.Entity<Payslip>(e =>
        {
            e.Property(x => x.NetAmount).HasPrecision(12, 2);
            e.HasIndex(x => new { x.PersonnelId, x.Year, x.Month });
            e.HasOne(x => x.Personnel)
                .WithMany()
                .HasForeignKey(x => x.PersonnelId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.UploadedBy)
                .WithMany()
                .HasForeignKey(x => x.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ---- JobApplication ----
        b.Entity<JobApplication>(e =>
        {
            e.Ignore(x => x.FullName);
            e.HasIndex(x => x.NationalId);
        });

        // ---- AuditLog ----
        b.Entity<AuditLog>(e => e.HasIndex(x => x.CreatedAt));

        // ---- Holiday ----
        b.Entity<Holiday>(e => e.HasIndex(x => x.Date).IsUnique());

        // ---- Notification ----
        b.Entity<Notification>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.IsRead });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- PushToken ----
        b.Entity<PushToken>(e =>
        {
            e.HasIndex(x => x.Token).IsUnique();
            e.HasIndex(x => new { x.UserId, x.IsActive });
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- Department ----
        b.Entity<Department>(e =>
        {
            e.HasOne(x => x.Manager).WithMany().HasForeignKey(x => x.ManagerPersonnelId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<Personnel>(e =>
        {
            e.HasOne(x => x.Dept).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- ApprovalStepTemplate ----
        b.Entity<ApprovalStepTemplate>(e =>
        {
            e.HasIndex(x => new { x.DepartmentId, x.Order });
            e.HasOne(x => x.Department).WithMany(d => d.Steps).HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SpecificPerson).WithMany().HasForeignKey(x => x.SpecificPersonnelId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- ApprovalRequest / ApprovalStep ----
        b.Entity<ApprovalRequest>(e =>
        {
            e.HasIndex(x => new { x.Kind, x.RequestId });
            e.HasOne(x => x.Requester).WithMany().HasForeignKey(x => x.RequesterPersonnelId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<ApprovalStep>(e =>
        {
            e.HasIndex(x => new { x.ApprovalRequestId, x.Order });
            e.HasIndex(x => new { x.ApproverPersonnelId, x.Status });
            e.HasOne(x => x.ApprovalRequest).WithMany(r => r.Steps).HasForeignKey(x => x.ApprovalRequestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApproverPersonnelId).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- Advance / Expense ----
        b.Entity<AdvanceRequest>(e =>
        {
            e.Property(x => x.Amount).HasPrecision(12, 2);
            e.HasOne(x => x.Personnel).WithMany().HasForeignKey(x => x.PersonnelId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<ExpenseRequest>(e =>
        {
            e.Property(x => x.Amount).HasPrecision(12, 2);
            e.HasOne(x => x.Personnel).WithMany().HasForeignKey(x => x.PersonnelId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- FeedbackItem (Çalışan Sesi) ----
        b.Entity<FeedbackItem>(e =>
        {
            e.HasIndex(x => new { x.Kind, x.Status });
            e.HasOne(x => x.Personnel).WithMany().HasForeignKey(x => x.PersonnelId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.HandledBy).WithMany().HasForeignKey(x => x.HandledByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- ContactUpdateRequest ----
        b.Entity<ContactUpdateRequest>(e =>
        {
            e.HasIndex(x => new { x.PersonnelId, x.Status });
            e.HasOne(x => x.Personnel).WithMany().HasForeignKey(x => x.PersonnelId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.HandledBy).WithMany().HasForeignKey(x => x.HandledByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        // ---- Training / TrainingProgress ----
        b.Entity<Training>(e =>
        {
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });
        b.Entity<TrainingProgress>(e =>
        {
            e.HasIndex(x => new { x.TrainingId, x.PersonnelId }).IsUnique();
            e.HasOne(x => x.Training).WithMany(t => t.Progresses).HasForeignKey(x => x.TrainingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Personnel).WithMany().HasForeignKey(x => x.PersonnelId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- InternalPosting / InternalApplication ----
        b.Entity<InternalPosting>(e =>
        {
            e.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });
        b.Entity<InternalApplication>(e =>
        {
            e.HasIndex(x => new { x.PostingId, x.PersonnelId }).IsUnique();
            e.HasOne(x => x.Posting).WithMany(p => p.Applications).HasForeignKey(x => x.PostingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Personnel).WithMany().HasForeignKey(x => x.PersonnelId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.HandledBy).WithMany().HasForeignKey(x => x.HandledByUserId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
