using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Pdks.Api.Data;
using Pdks.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------------- Options ----------------
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection(SmsOptions.Section));
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection(OtpOptions.Section));

var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
    jwt.Key = "PDKS-DEV-ONLY-CHANGE-THIS-SECRET-KEY-32+chars!"; // Üretimde env/secret'tan verin.

// TokenService (IOptions) ile JwtBearer'ın aynı anahtarı kullanmasını garanti et.
builder.Services.Configure<JwtOptions>(o =>
{
    o.Issuer = jwt.Issuer;
    o.Audience = jwt.Audience;
    o.Key = jwt.Key;
    o.AccessTokenMinutes = jwt.AccessTokenMinutes;
    o.RefreshTokenDays = jwt.RefreshTokenDays;
});

// ---------------- Database ----------------
var provider = builder.Configuration.GetValue<string>("Database:Provider") ?? "SqlServer";
var connString = builder.Configuration.GetConnectionString("Default")
                 ?? "Data Source=pdks.db";

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    switch (provider.ToLowerInvariant())
    {
        case "sqlite":
            opt.UseSqlite(connString);
            break;
        default: // SqlServer
            opt.UseSqlServer(connString);
            break;
    }
});

// ---------------- App services ----------------
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.Section));
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<QrTokenService>();
builder.Services.AddSingleton<FileStorageService>();
builder.Services.AddSingleton<LeaveDocumentService>();
builder.Services.AddSingleton<PayrollPdfService>();
builder.Services.AddScoped<LeaveService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ApprovalService>();
builder.Services.AddScoped<RequestWorkflowService>();

// SMS sağlayıcısı
var smsProvider = builder.Configuration.GetValue<string>($"{SmsOptions.Section}:Provider") ?? "Console";
if (smsProvider.Equals("Netgsm", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddHttpClient<ISmsSender, NetgsmSmsSender>();
else
    builder.Services.AddSingleton<ISmsSender, ConsoleSmsSender>();

// Anlık (push) bildirim sağlayıcısı — varsayılan Expo Push.
var pushProvider = builder.Configuration.GetValue<string>("Push:Provider") ?? "Expo";
builder.Services.AddHttpClient("expo-push");
if (pushProvider.Equals("None", StringComparison.OrdinalIgnoreCase) ||
    pushProvider.Equals("Console", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IPushSender, NullPushSender>();
else
    builder.Services.AddSingleton<IPushSender, ExpoPushSender>();

// ---------------- Auth ----------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization();

// ---------------- CORS ----------------
const string CorsPolicy = "CokoClients";
var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
{
    if (corsOrigins.Length > 0)
        p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    else if (builder.Environment.IsDevelopment())
        // Geliştirmede tüm origin'lere izin (kimlik bilgisi olmadan).
        p.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod();
    else
        // Üretimde Cors:Origins tanımlı değilse hiçbir cross-origin isteğe izin verilmez.
        p.WithOrigins("https://localhost").AllowAnyHeader().AllowAnyMethod();
}));

// ---------------- Rate limiting ----------------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Kimlik doğrulama uçları için IP başına dakikada 10 istek.
    options.AddPolicy("auth", ctx =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// ---------------- MVC / JSON ----------------
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "COKO-SİS API", Version = "v1" });
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [scheme] = Array.Empty<string>() });
});

var app = builder.Build();

// ---------------- DB init + seed ----------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<PasswordHasher>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbInit");

    // EF migration mevcutsa (üretim yolu) onu uygula; yoksa hızlı başlangıç için şemayı
    // modele göre oluştur ve sonradan eklenen kolon/tabloları idempotent olarak uyumla.
    if (db.Database.GetMigrations().Any())
    {
        await db.Database.MigrateAsync();
    }
    else
    {
        await db.Database.EnsureCreatedAsync();
        await DbMaintenance.ReconcileAsync(db, logger);
    }
    await DbSeeder.SeedAsync(db, hasher);
}

// Güvenlik başlıkları (her yanıta)
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"] = "DENY";
    h["Referrer-Policy"] = "no-referrer";
    h["X-Permitted-Cross-Domain-Policies"] = "none";
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors(CorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => Results.Ok(new { service = "COKO-SİS API", status = "running", docs = "/swagger" }));

app.Run();
