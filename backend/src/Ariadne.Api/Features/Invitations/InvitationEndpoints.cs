using System.Security.Cryptography;
using System.Text;
using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Email;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Invitations;

/// <summary>
/// Undang orang ke proyek lewat email (mockup 08) dan halaman terima undangan (Keputusan 2: tautan membuka
/// halaman untuk membuat nama dan password sekali). Hanya Pengelola proyek dan Admin yang mengundang.
/// </summary>
internal static class InvitationEndpoints
{
    public const int MaxEmailsPerRequest = 20;

    // Satu pesan untuk semua tautan yang tidak bisa dipakai, supaya tidak membocorkan undangan mana yang pernah ada
    private const string InvalidInvitation = "Undangan tidak valid, sudah dipakai, atau sudah kedaluwarsa. Minta undangan baru ke pengelola proyek.";

    public static IEndpointRouteBuilder MapInvitationEndpoints(this IEndpointRouteBuilder app)
    {
        var project = app.MapGroup("/api/projects/{id:guid}/invitations");
        project.MapGet("", List);
        project.MapPost("", Create);

        var invitations = app.MapGroup("/api/invitations");
        invitations.MapPatch("/{invitationId:guid}", ChangeRole);
        invitations.MapDelete("/{invitationId:guid}", Cancel);
        // Token dikirim di badan permintaan (bukan alamat) supaya tidak tercatat di log akses
        invitations.MapPost("/preview", Preview).AllowAnonymous().RequireRateLimiting(RateLimiting.AuthPolicy);
        invitations.MapPost("/accept", Accept).AllowAnonymous().RequireRateLimiting(RateLimiting.AuthPolicy);
        return app;
    }

    private static async Task<IResult> List(Guid id, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var rootId = await RootOfAsync(id, db, ct);
        access.EnsureCanManageProject(rootId);

        var now = clock.UtcNow;
        var items = await db.Invitations.AsNoTracking()
            .Where(i => i.ProjectId == rootId && i.Status == InvitationStatus.Menunggu)
            .OrderBy(i => i.CreatedAt).ThenBy(i => i.Email)
            .Select(i => new InvitationItem(i.Id, i.Email, i.Role, i.InvitedBy!.DisplayName, i.CreatedAt, i.ExpiresAt, i.ExpiresAt <= now))
            .ToListAsync(ct);
        return Results.Ok(items);
    }

    private static async Task<IResult> Create(
        Guid id,
        CreateInvitationsRequest request,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        UserManager<AppUser> users,
        IEmailOutbox outbox,
        IClock clock,
        IConfiguration config,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var root = await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanManageProject(root.RootId);
        var project = root.RootId == root.Id ? root : await db.Projects.AsNoTracking().SingleAsync(p => p.Id == root.RootId, ct);
        if (project.ArchivedAt is not null)
        {
            throw new ValidationFailedException("emails", "Proyek yang diarsipkan tidak bisa menerima anggota baru.");
        }

        var role = Validate.Enum<ProjectRole>("role", request.Role, "Peran");
        var message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim();
        if (message is { Length: > 500 })
        {
            throw new ValidationFailedException("message", "Pesan maksimal 500 karakter.");
        }

        var emails = ParseEmails(request.Emails, users);
        var inviter = (await users.FindByIdAsync(access.UserId.ToString()))!.DisplayName;
        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:18080";
        var now = clock.UtcNow;

        var normalized = emails.Select(e => e.Normalized).ToList();
        var accounts = await db.Users.AsNoTracking()
            .Where(u => normalized.Contains(u.NormalizedEmail!))
            .Select(u => new { u.Id, u.NormalizedEmail, u.IsActive })
            .ToDictionaryAsync(u => u.NormalizedEmail!, ct);
        var memberIds = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == project.Id)
            .Select(m => m.UserId)
            .ToHashSetAsync(ct);

        var results = new List<InviteResult>();
        var mail = new List<EmailMessage>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        // Undangan lama untuk email yang sama digantikan (dibatalkan dulu, supaya indeks "satu yang menunggu" tidak bentrok)
        await db.Invitations
            .Where(i => i.ProjectId == project.Id && i.Status == InvitationStatus.Menunggu && normalized.Contains(i.NormalizedEmail))
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.Status, InvitationStatus.Dibatalkan).SetProperty(i => i.ResolvedAt, now), ct);

        foreach (var (email, norm) in emails)
        {
            if (accounts.TryGetValue(norm, out var account))
            {
                if (memberIds.Contains(account.Id))
                {
                    results.Add(new InviteResult(email, InviteOutcome.SudahAnggota));
                }
                else if (!account.IsActive)
                {
                    results.Add(new InviteResult(email, InviteOutcome.AkunNonaktif));
                }
                else
                {
                    db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = account.Id, Role = role, AddedAt = now });
                    memberIds.Add(account.Id);
                    results.Add(new InviteResult(email, InviteOutcome.Ditambahkan));
                    mail.Add(InvitationEmails.Added(email, inviter, project.Name, role, message, InvitationEmails.ProjectLink(baseUrl, project.Id)));
                }

                continue;
            }

            var token = NewToken();
            db.Invitations.Add(new Invitation
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Email = email,
                NormalizedEmail = norm,
                Role = role,
                TokenHash = Hash(token),
                Message = message,
                InvitedById = access.UserId,
                Status = InvitationStatus.Menunggu,
                CreatedAt = now,
                ExpiresAt = now + Invitation.Lifetime,
            });
            results.Add(new InviteResult(email, InviteOutcome.Diundang));
            mail.Add(InvitationEmails.Invite(email, inviter, project.Name, role, message, InvitationEmails.AcceptLink(baseUrl, token)));
        }

        await db.SaveOrConflictAsync("Undangan untuk email ini baru saja dibuat orang lain. Muat ulang halaman.", ct);
        await transaction.CommitAsync(ct);

        // Email baru dikirim setelah tersimpan: tidak ada email untuk undangan yang gagal disimpan
        foreach (var m in mail)
        {
            outbox.Enqueue(m);
        }

        return Results.Ok(results);
    }

    private static async Task<IResult> ChangeRole(Guid invitationId, UpdateInvitationRequest request, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var invitation = await FindPendingAsync(invitationId, access, db, ct);
        invitation.Role = Validate.Enum<ProjectRole>("role", request.Role, "Peran");
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Cancel(Guid invitationId, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var invitation = await FindPendingAsync(invitationId, access, db, ct);
        invitation.Status = InvitationStatus.Dibatalkan;
        invitation.ResolvedAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Preview(InvitationTokenRequest request, AppDbContext db, UserManager<AppUser> users, IClock clock, CancellationToken ct)
    {
        var invitation = await FindUsableAsync(request.Token, db, clock, ct);
        if (invitation is null)
        {
            return Invalid();
        }

        var hasAccount = await db.Users.AnyAsync(u => u.NormalizedEmail == invitation.NormalizedEmail, ct);
        return Results.Ok(new InvitationPreview(
            invitation.Email,
            invitation.ProjectId,
            invitation.Project!.Name,
            invitation.Role,
            invitation.InvitedBy!.DisplayName,
            invitation.Message,
            hasAccount));
    }

    private static async Task<IResult> Accept(
        AcceptInvitationRequest request,
        AppDbContext db,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        IClock clock,
        CancellationToken ct)
    {
        var invitation = await FindUsableAsync(request.Token, db, clock, ct);
        if (invitation is null)
        {
            // Hash palsu supaya lamanya mirip dengan undangan yang sah (tidak membocorkan lewat waktu, pedoman B9)
            _ = users.PasswordHasher.HashPassword(new AppUser(), request.Password ?? "");
            return Invalid();
        }

        var now = clock.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        // Sekali pakai, juga bila dua permintaan datang bersamaan: baris undangan dikunci dulu; permintaan kedua
        // menunggu, lalu melihat statusnya sudah bukan Menunggu dan ditolak (tanpa sempat membuat akun kembar)
        var locked = await db.Database
            .SqlQuery<Guid>($"SELECT id AS \"Value\" FROM invitations WHERE id = {invitation.Id} AND status = 'Menunggu' FOR UPDATE")
            .ToListAsync(ct);
        if (locked.Count == 0)
        {
            return Invalid();
        }

        var existing = await users.FindByEmailAsync(invitation.Email);
        AppUser user;
        if (existing is not null)
        {
            // Sudah punya akun (mis. dibuat Admin setelah undangan dikirim): password lama tidak disentuh
            if (!existing.IsActive)
            {
                return Invalid();
            }

            user = existing;
        }
        else
        {
            var name = Validate.Text("displayName", request.DisplayName, 100, "Nama");
            user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = invitation.Email,
                Email = invitation.Email,
                EmailConfirmed = true, // tautan diterima di email itu
                DisplayName = name,
                IsActive = true,
                CreatedAt = now,
            };
            (await users.CreateAsync(user, request.Password ?? "")).ThrowIfFailed("password");
        }

        var claimed = await db.Invitations
            .Where(i => i.Id == invitation.Id && i.Status == InvitationStatus.Menunggu)
            .ExecuteUpdateAsync(
                s => s.SetProperty(i => i.Status, InvitationStatus.Diterima)
                    .SetProperty(i => i.ResolvedAt, now)
                    .SetProperty(i => i.AcceptedUserId, user.Id),
                ct);
        if (claimed == 0)
        {
            return Invalid(); // transaksi tidak di-commit: akun baru ikut batal
        }

        if (!await db.ProjectMembers.AnyAsync(m => m.ProjectId == invitation.ProjectId && m.UserId == user.Id, ct))
        {
            db.ProjectMembers.Add(new ProjectMember { ProjectId = invitation.ProjectId, UserId = user.Id, Role = invitation.Role, AddedAt = now });
            await db.SaveChangesAsync(ct);
        }

        await transaction.CommitAsync(ct);

        if (existing is not null)
        {
            return Results.Ok(new AcceptInvitationResponse(false, invitation.ProjectId));
        }

        await signIn.SignInAsync(user, isPersistent: false);
        return Results.Ok(new AcceptInvitationResponse(true, invitation.ProjectId));
    }

    private static IResult Invalid() => Results.Problem(title: InvalidInvitation, statusCode: StatusCodes.Status400BadRequest);

    /// <summary>Undangan yang masih bisa dipakai: menunggu, belum kedaluwarsa, proyeknya tidak diarsipkan.</summary>
    private static async Task<Invitation?> FindUsableAsync(string? token, AppDbContext db, IClock clock, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 200)
        {
            return null;
        }

        var hash = Hash(token.Trim());
        var now = clock.UtcNow;
        return await db.Invitations.AsNoTracking()
            .Include(i => i.Project)
            .Include(i => i.InvitedBy)
            .SingleOrDefaultAsync(
                i => i.TokenHash == hash && i.Status == InvitationStatus.Menunggu && i.ExpiresAt > now && i.Project!.ArchivedAt == null,
                ct);
    }

    /// <summary>Undangan yang masih menunggu di proyek yang boleh dikelola; selain itu dianggap tidak ada.</summary>
    private static async Task<Invitation> FindPendingAsync(Guid invitationId, UserAccess access, AppDbContext db, CancellationToken ct)
    {
        var invitation = await db.Invitations.SingleOrDefaultAsync(i => i.Id == invitationId && i.Status == InvitationStatus.Menunggu, ct)
            ?? throw new NotFoundException();
        access.EnsureCanManageProject(invitation.ProjectId);
        return invitation;
    }

    private static List<(string Email, string Normalized)> ParseEmails(IReadOnlyList<string>? emails, UserManager<AppUser> users)
    {
        var list = (emails ?? []).Where(e => !string.IsNullOrWhiteSpace(e)).ToList();
        if (list.Count == 0)
        {
            throw new ValidationFailedException("emails", "Isi minimal satu email.");
        }

        if (list.Count > MaxEmailsPerRequest)
        {
            throw new ValidationFailedException("emails", $"Maksimal {MaxEmailsPerRequest} email sekali kirim.");
        }

        var result = new List<(string, string)>();
        foreach (var raw in list)
        {
            string email;
            try
            {
                email = Validate.Email("emails", raw);
            }
            catch (ValidationFailedException)
            {
                throw new ValidationFailedException("emails", $"Format email tidak valid: {raw.Trim()}");
            }

            var normalized = users.NormalizeEmail(email);
            if (result.All(r => r.Item2 != normalized))
            {
                result.Add((email, normalized));
            }
        }

        return result;
    }

    private static async Task<Guid> RootOfAsync(Guid projectId, AppDbContext db, CancellationToken ct) =>
        await db.Projects.AsNoTracking().Where(p => p.Id == projectId).Select(p => (Guid?)p.RootId).SingleOrDefaultAsync(ct)
        ?? throw new NotFoundException();

    private static string NewToken() => Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string Hash(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
