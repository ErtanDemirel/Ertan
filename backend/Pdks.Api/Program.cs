using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<QrTokenService>();
builder.Services.AddScoped<LeaveService>();

// SMS sağlayıcısı
var smsProvider = builder.Configuration.GetValue<string>($"{SmsOptions.Section}:Provider") ?? "Console";
if (smsProvider.Equals("Netgsm", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddHttpClient<ISmsSender, NetgsmSmsSender>();
else
    builder.Services.AddSingleton<ISmsSender, ConsoleSmsSender>();

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
const string CorsPolicy = "PdksClients";
builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p =>
    p.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true)));

// ---------------- MVC / JSON ----------------
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "PDKS API", Version = "v1" });
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
    // Not: Üretimde EF migration kullanın (dotnet ef database update).
    // Hızlı başlangıç için şemayı modele göre oluşturur:
    await db.Database.EnsureCreatedAsync();
    await DbSeeder.SeedAsync(db, hasher);
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/", () => Results.Ok(new { service = "PDKS API", status = "running", docs = "/swagger" }));

app.Run();
