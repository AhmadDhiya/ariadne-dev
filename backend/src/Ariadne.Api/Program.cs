using Ariadne.Api.Auth;
using Ariadne.Api.Features.Health;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAriadneClock(builder.Configuration, builder.Environment);
builder.Services.AddAriadneDatabase(builder.Configuration);
builder.Services.AddAriadneAuth(builder.Environment);
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseAriadneErrorHandling();
app.UseSecurityHeaders();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthEndpoints();

await app.MigrateDatabaseIfConfiguredAsync();
await app.RunAsync();

public partial class Program;
