namespace Ariadne.Api.Tests.Infrastructure;

/// <summary>Bentuk ProblemDetails yang dikembalikan API untuk semua kegagalan.</summary>
public sealed record ProblemBody(int? Status, string? Title, Dictionary<string, string[]>? Errors);
