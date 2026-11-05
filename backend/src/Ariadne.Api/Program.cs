using System.Text.Json.Serialization;
using Ariadne.Api.Auth;
using Ariadne.Api.Features.Auth;
using Ariadne.Api.Features.Dashboard;
using Ariadne.Api.Features.Gantt;
using Ariadne.Api.Features.Health;
using Ariadne.Api.Features.Invitations;
using Ariadne.Api.Features.Milestones;
using Ariadne.Api.Features.Notifications;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Features.Search;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Features.Teams;
using Ariadne.Api.Features.TeamTimeline;
using Ariadne.Api.Features.Users;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Data.Seed;
using Ariadne.Api.Infrastructure.Email;
using Ariadne.Api.Infrastructure.Web;

var builder = WebApplication.CreateBuilder(args);

// Enum (status, peran) dikirim sebagai teks yang bisa dibaca ("Pengelola"), bukan angka
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddAriadneClock(builder.Configuration, builder.Environment);
builder.Services.AddAriadneDatabase(builder.Configuration);
builder.Services.AddAriadneAuth(builder.Environment);
builder.Services.AddAriadneEmail(builder.Configuration);
builder.Services.AddAriadneRateLimiting(builder.Configuration);
builder.Services.AddAriadneNotifications(builder.Configuration);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseAriadneErrorHandling();
app.UseSecurityHeaders();
app.UseCsrfProtection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthEndpoints();
app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapTeamEndpoints();
app.MapProjectEndpoints();
app.MapTaskEndpoints();
app.MapActivityEndpoints();
app.MapDashboardEndpoints();
app.MapSearchEndpoints();
app.MapMilestoneEndpoints();
app.MapGanttEndpoints();
app.MapTaskMoveEndpoints();
app.MapTeamTimelineEndpoints();
app.MapInvitationEndpoints();
app.MapNotificationEndpoints();

await app.MigrateDatabaseIfConfiguredAsync();
await app.CreateIfConfiguredAsync();
await app.SeedIfConfiguredAsync();
await app.RunAsync();

public partial class Program;
