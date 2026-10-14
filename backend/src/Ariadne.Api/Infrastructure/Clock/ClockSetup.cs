using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Ariadne.Api.Infrastructure.Clock;

internal static partial class ClockSetup
{
    public const string FakeTodayKey = "Ariadne:FakeToday";

    public static IServiceCollection AddAriadneClock(this IServiceCollection services, IConfiguration config, IHostEnvironment env)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<IClock>(sp =>
        {
            var fakeToday = config.GetValue<DateOnly?>(FakeTodayKey);

            // Tanggal palsu hanya untuk demo di Development, tidak pernah di produksi (pedoman A6, I2).
            if (fakeToday is not null && !env.IsDevelopment())
            {
                LogFakeTodayIgnored(sp.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(ClockSetup)), env.EnvironmentName);
                fakeToday = null;
            }

            return new AriadneClock(sp.GetRequiredService<TimeProvider>(), fakeToday);
        });
        return services;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Ariadne:FakeToday diabaikan karena environment {Environment} bukan Development")]
    private static partial void LogFakeTodayIgnored(ILogger logger, string environment);
}
