using System.Text.RegularExpressions;
using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Tasks;

internal static partial class TaskEndpoints
{
    private const int MaxAssignees = 10;
    private const int MaxLabels = 10;
    private const int MaxFilterValues = 50;

    public static IEndpointRouteBuilder MapTaskEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{id:guid}/tasks", List);
        app.MapPost("/api/projects/{id:guid}/tasks", Create);
        app.MapGet("/api/projects/{id:guid}/labels", Labels);

        var tasks = app.MapGroup("/api/tasks");
        tasks.MapGet("/{key}", Get);
        tasks.MapPatch("/{id:guid}", Update);
        tasks.MapPut("/{id:guid}/status", SetStatus);
        tasks.MapPut("/{id:guid}/dates", SetDates);
        tasks.MapPut("/{id:guid}/assignees", SetAssignees);
        tasks.MapPost("/{id:guid}/subtasks", CreateSubtask);
        tasks.MapDelete("/{id:guid}", Delete);
        return app;
    }

    [GeneratedRegex(@"^([A-Za-z][A-Za-z0-9]{1,5})-(\d{1,9})$")]
    private static partial Regex KeyPattern();

    [GeneratedRegex(@"^(?:([A-Za-z][A-Za-z0-9]{1,5})-)?(\d{1,9})$")]
    private static partial Regex NumberSearchPattern();

    // ---------- membaca ----------

    private static async Task<IResult> List(
        Guid id,
        [AsParameters] TaskFilter filter,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await ActiveProjectAsync(db, id, ct);
        access.EnsureCanViewProject(project.RootId);

        var family = await db.Projects.AsNoTracking()
            .Where(p => p.RootId == project.RootId && p.ArchivedAt == null)
            .Select(p => new { p.Id, p.ParentId })
            .ToListAsync(ct);
        var subtree = TaskQueries.Subtree(family.Select(p => (p.Id, p.ParentId)), id);
        var today = clock.Today;

        // Progres selalu dari seluruh task proyek ini (tanpa sub-task), tidak terpengaruh filter
        var totals = await db.Tasks.AsNoTracking()
            .Where(t => subtree.Contains(t.ProjectId) && t.ParentTaskId == null)
            .GroupBy(t => t.Status == WorkStatus.Done)
            .Select(g => new { IsDone = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var done = totals.Where(x => x.IsDone).Sum(x => x.Count);
        var total = totals.Sum(x => x.Count);

        var query = db.Tasks.WithDetails().Where(t => subtree.Contains(t.ProjectId));
        query = ApplyFilter(query, filter, access.UserId, today);
        var matched = await query.ToListAsync(ct);

        // Sub-task yang lolos filter ditampilkan bersama induknya supaya konteksnya jelas
        var loaded = matched.Select(t => t.Id).ToHashSet();
        var missingParents = matched.Where(t => t.ParentTaskId is { } p && !loaded.Contains(p)).Select(t => t.ParentTaskId!.Value).Distinct().ToList();
        if (missingParents.Count > 0)
        {
            matched.AddRange(await db.Tasks.WithDetails().Where(t => missingParents.Contains(t.Id)).ToListAsync(ct));
        }

        var codes = await TaskQueries.RootCodesAsync(db, [project.RootId], ct);
        var rows = await TaskQueries.BuildRowsAsync(db, matched, codes, today, ct);
        return Results.Ok(new TaskList(id, access.CanEditTasks(project.RootId), new TaskProgress(done, total, TaskRules.ProgressPercent(done, total)), rows));
    }

    private static async Task<IResult> Get(string key, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await FindByKeyAsync(db, key, ct);
        access.EnsureCanViewProject(task.RootProjectId);

        var row = await TaskQueries.RowAsync(db, task.Id, clock.Today, ct);
        return Results.Ok(new TaskDetail(row, task.Description, access.CanEditTasks(task.RootProjectId)));
    }

    private static async Task<IResult> Labels(Guid id, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await ActiveProjectAsync(db, id, ct);
        access.EnsureCanViewProject(project.RootId);

        var labels = await db.Labels.AsNoTracking()
            .Where(l => l.RootProjectId == project.RootId)
            .OrderBy(l => l.NormalizedName)
            .Select(l => new LabelItem(l.Id, l.Name))
            .ToListAsync(ct);
        return Results.Ok(labels);
    }

    // ---------- membuat ----------

    private static async Task<IResult> Create(Guid id, CreateTaskRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await ActiveProjectAsync(db, id, ct);
        access.EnsureCanEditTasks(project.RootId);

        var row = await CreateCoreAsync(db, clock, access, project.RootId, project.Id, null, request, ct);
        return Results.Created($"/api/tasks/{row.Id}", row);
    }

    private static async Task<IResult> CreateSubtask(Guid id, CreateTaskRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var parent = await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanEditTasks(parent.RootProjectId);
        if (parent.ParentTaskId is not null)
        {
            throw new ValidationFailedException("parentTaskId", "Sub-task tidak boleh punya sub-task lagi.");
        }

        var row = await CreateCoreAsync(db, clock, access, parent.RootProjectId, parent.ProjectId, parent.Id, request, ct);
        return Results.Created($"/api/tasks/{row.Id}", row);
    }

    private static async Task<TaskRow> CreateCoreAsync(
        AppDbContext db,
        IClock clock,
        UserAccess access,
        Guid rootId,
        Guid projectId,
        Guid? parentTaskId,
        CreateTaskRequest request,
        CancellationToken ct)
    {
        var title = Validate.Text("title", request.Title, 200, "Judul");
        var description = CleanDescription(request.Description);
        var status = request.Status is null ? WorkStatus.NotStarted : Validate.Enum<WorkStatus>("status", request.Status, "Status");
        var priority = request.Priority is null ? Priority.Medium : Validate.Enum<Priority>("priority", request.Priority, "Prioritas");
        CheckDates(request.StartDate, request.DueDate);
        var assigneeIds = await CheckAssigneesAsync(db, rootId, request.AssigneeIds, ct);
        var now = clock.UtcNow;

        var task = new ProjectTask
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            RootProjectId = rootId,
            ParentTaskId = parentTaskId,
            Title = title,
            Description = description,
            Priority = priority,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            CreatedById = access.UserId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        await ApplyStatusAsync(db, task, rootId, status, request.HoldReason, request.WaitingOnUserId, request.WaitingOnText, now, ct);
        task.SortOrder = (await db.Tasks.Where(t => t.ProjectId == projectId && t.ParentTaskId == parentTaskId).Select(t => (int?)t.SortOrder).MaxAsync(ct) ?? 0) + 1;
        foreach (var userId in assigneeIds)
        {
            task.Assignees.Add(new TaskAssignee { TaskId = task.Id, UserId = userId });
        }

        foreach (var label in await ResolveLabelsAsync(db, rootId, request.Labels, ct))
        {
            task.Labels.Add(new TaskLabel { TaskId = task.Id, LabelId = label.Id });
        }

        // Nomor berikutnya diambil dan task disimpan dalam satu transaksi: dua orang yang membuat task bersamaan
        // tidak pernah mendapat nomor yang sama (pedoman E3), dan nomor tidak terbuang bila penyimpanan gagal.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        task.Number = (await db.Database
            .SqlQuery<int>($"UPDATE projects SET next_task_number = next_task_number + 1 WHERE id = {rootId} RETURNING next_task_number - 1 AS \"Value\"")
            .ToListAsync(ct)).Single();
        db.Tasks.Add(task);
        await db.SaveOrConflictAsync("Task tidak bisa disimpan karena bentrok. Coba lagi.", ct);
        await transaction.CommitAsync(ct);

        return await TaskQueries.RowAsync(db, task.Id, clock.Today, ct);
    }

    // ---------- mengubah ----------

    private static async Task<IResult> Update(Guid id, UpdateTaskRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.Include(t => t.Labels).SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanEditTasks(task.RootProjectId);

        if (request.Title is not null)
        {
            task.Title = Validate.Text("title", request.Title, 200, "Judul");
        }

        if (request.Description is not null)
        {
            task.Description = CleanDescription(request.Description);
        }

        if (request.Priority is not null)
        {
            task.Priority = Validate.Enum<Priority>("priority", request.Priority, "Prioritas");
        }

        if (request.ProjectId is { } targetId && targetId != task.ProjectId)
        {
            await MoveToProjectAsync(db, task, targetId, ct);
        }

        if (request.Labels is not null)
        {
            var wanted = (await ResolveLabelsAsync(db, task.RootProjectId, request.Labels, ct)).Select(l => l.Id).ToHashSet();
            task.Labels.RemoveAll(l => !wanted.Contains(l.LabelId));
            foreach (var labelId in wanted.Where(w => task.Labels.All(l => l.LabelId != w)))
            {
                task.Labels.Add(new TaskLabel { TaskId = task.Id, LabelId = labelId });
            }
        }

        task.UpdatedAt = clock.UtcNow;
        await db.SaveOrConflictAsync("Task tidak bisa disimpan karena bentrok. Coba lagi.", ct);
        return Results.Ok(await TaskQueries.RowAsync(db, id, clock.Today, ct));
    }

    private static async Task MoveToProjectAsync(AppDbContext db, ProjectTask task, Guid targetId, CancellationToken ct)
    {
        if (task.ParentTaskId is not null)
        {
            throw new ValidationFailedException("projectId", "Sub-task ikut pindah bersama task induknya.");
        }

        var target = await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == targetId && p.RootId == task.RootProjectId && p.ArchivedAt == null, ct)
            ?? throw new ValidationFailedException("projectId", "Sub-proyek tujuan tidak ditemukan di proyek ini.");

        task.ProjectId = target.Id;
        foreach (var child in await db.Tasks.Where(t => t.ParentTaskId == task.Id).ToListAsync(ct))
        {
            child.ProjectId = target.Id;
        }
    }

    private static async Task<IResult> SetStatus(Guid id, SetStatusRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanEditTasks(task.RootProjectId);

        var status = Validate.Enum<WorkStatus>("status", request.Status, "Status");
        var now = clock.UtcNow;
        await ApplyStatusAsync(db, task, task.RootProjectId, status, request.HoldReason, request.WaitingOnUserId, request.WaitingOnText, now, ct);
        task.UpdatedAt = now;
        await db.SaveOrConflictAsync("Task tidak bisa disimpan karena bentrok. Coba lagi.", ct);
        return Results.Ok(await TaskQueries.RowAsync(db, id, clock.Today, ct));
    }

    private static async Task<IResult> SetDates(Guid id, SetDatesRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanEditTasks(task.RootProjectId);

        CheckDates(request.StartDate, request.DueDate);
        task.StartDate = request.StartDate;
        task.DueDate = request.DueDate;
        task.UpdatedAt = clock.UtcNow;
        await db.SaveOrConflictAsync("Task tidak bisa disimpan karena bentrok. Coba lagi.", ct);
        return Results.Ok(await TaskQueries.RowAsync(db, id, clock.Today, ct));
    }

    private static async Task<IResult> SetAssignees(Guid id, SetAssigneesRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.Include(t => t.Assignees).SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanEditTasks(task.RootProjectId);

        var wanted = await CheckAssigneesAsync(db, task.RootProjectId, request.UserIds, ct);
        task.Assignees.RemoveAll(a => !wanted.Contains(a.UserId));
        foreach (var userId in wanted.Where(w => task.Assignees.All(a => a.UserId != w)))
        {
            task.Assignees.Add(new TaskAssignee { TaskId = task.Id, UserId = userId });
        }

        task.UpdatedAt = clock.UtcNow;
        await db.SaveOrConflictAsync("Task tidak bisa disimpan karena bentrok. Coba lagi.", ct);
        return Results.Ok(await TaskQueries.RowAsync(db, id, clock.Today, ct));
    }

    private static async Task<IResult> Delete(Guid id, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanEditTasks(task.RootProjectId);

        // Dihapus = disembunyikan, termasuk semua sub-task-nya (keputusan 10); datanya tetap ada di database
        var now = clock.UtcNow;
        task.DeletedAt = now;
        foreach (var child in await db.Tasks.Where(t => t.ParentTaskId == id).ToListAsync(ct))
        {
            child.DeletedAt = now;
        }

        await db.SaveOrConflictAsync("Task tidak bisa dihapus karena bentrok. Coba lagi.", ct);
        return Results.NoContent();
    }

    // ---------- aturan bersama ----------

    /// <summary>
    /// Mengatur status dan kolom tertahan secara konsisten. Status tertahan WAJIB beralasan (ditolak 400 bila kosong);
    /// saat keluar dari status tertahan, alasan dan "menunggu siapa" dikosongkan.
    /// </summary>
    private static async Task ApplyStatusAsync(
        AppDbContext db,
        ProjectTask task,
        Guid rootId,
        WorkStatus status,
        string? holdReason,
        Guid? waitingOnUserId,
        string? waitingOnText,
        DateTimeOffset now,
        CancellationToken ct)
    {
        if (!TaskRules.IsHeld(status))
        {
            task.Status = status;
            task.HoldReason = null;
            task.WaitingOnUserId = null;
            task.WaitingOnText = null;
            task.HeldSince = null;
            return;
        }

        var reason = Validate.Text("holdReason", holdReason, 1000, "Alasan tertahan");
        var text = string.IsNullOrWhiteSpace(waitingOnText) ? null : waitingOnText.Trim();
        if (text is { Length: > 200 })
        {
            throw new ValidationFailedException("waitingOnText", "Menunggu siapa maksimal 200 karakter.");
        }

        if (waitingOnUserId is not null && text is not null)
        {
            throw new ValidationFailedException("waitingOnText", "Pilih satu: orang di proyek atau teks bebas.");
        }

        if (waitingOnUserId is { } waitingId && !await db.ProjectMembers.AnyAsync(m => m.ProjectId == rootId && m.UserId == waitingId, ct))
        {
            throw new ValidationFailedException("waitingOnUserId", "Orang ini bukan anggota proyek.");
        }

        // Berpindah antar status tertahan tidak mengulang "sejak kapan"
        task.HeldSince = TaskRules.IsHeld(task.Status) && task.HeldSince is not null ? task.HeldSince : now;
        task.Status = status;
        task.HoldReason = reason;
        task.WaitingOnUserId = waitingOnUserId;
        task.WaitingOnText = text;
    }

    private static void CheckDates(DateOnly? start, DateOnly? due)
    {
        var min = new DateOnly(2000, 1, 1);
        var max = new DateOnly(2100, 12, 31);
        if (start is { } s && (s < min || s > max))
        {
            throw new ValidationFailedException("startDate", "Tanggal mulai tidak masuk akal.");
        }

        if (due is { } d && (d < min || d > max))
        {
            throw new ValidationFailedException("dueDate", "Tanggal selesai tidak masuk akal.");
        }

        if (start is not null && due is not null && due < start)
        {
            throw new ValidationFailedException("dueDate", "Tanggal selesai tidak boleh sebelum tanggal mulai.");
        }
    }

    private static string? CleanDescription(string? description)
    {
        var trimmed = description?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length > 5000 ? throw new ValidationFailedException("description", "Keterangan maksimal 5000 karakter.") : trimmed;
    }

    /// <summary>PIC harus Pengelola atau Anggota proyek yang masih aktif (Tamu tidak bisa jadi PIC).</summary>
    private static async Task<List<Guid>> CheckAssigneesAsync(AppDbContext db, Guid rootId, IReadOnlyList<Guid>? userIds, CancellationToken ct)
    {
        var ids = (userIds ?? []).Distinct().ToList();
        if (ids.Count > MaxAssignees)
        {
            throw new ValidationFailedException("assigneeIds", $"PIC maksimal {MaxAssignees} orang.");
        }

        if (ids.Count == 0)
        {
            return ids;
        }

        var valid = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == rootId && m.Role != ProjectRole.Tamu && ids.Contains(m.UserId) && m.User!.IsActive)
            .CountAsync(ct);
        if (valid != ids.Count)
        {
            throw new ValidationFailedException("assigneeIds", "PIC harus anggota aktif proyek ini (bukan Tamu).");
        }

        return ids;
    }

    /// <summary>Mencari label berdasarkan nama (tanpa membedakan huruf besar/kecil); yang belum ada dibuat.</summary>
    private static async Task<List<Label>> ResolveLabelsAsync(AppDbContext db, Guid rootId, IReadOnlyList<string>? names, CancellationToken ct)
    {
        var wanted = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var raw in names ?? [])
        {
            var name = Validate.Text("labels", raw, 40, "Label");
            wanted.TryAdd(name.ToLowerInvariant(), name);
        }

        if (wanted.Count > MaxLabels)
        {
            throw new ValidationFailedException("labels", $"Label maksimal {MaxLabels} per task.");
        }

        var keys = wanted.Keys.ToList();
        var existing = await db.Labels.Where(l => l.RootProjectId == rootId && keys.Contains(l.NormalizedName)).ToListAsync(ct);
        foreach (var (key, name) in wanted.Where(w => existing.All(l => l.NormalizedName != w.Key)))
        {
            var label = new Label { Id = Guid.NewGuid(), RootProjectId = rootId, Name = name, NormalizedName = key };
            db.Labels.Add(label);
            existing.Add(label);
        }

        return existing;
    }

    // ---------- pencarian ----------

    private static IQueryable<ProjectTask> ApplyFilter(IQueryable<ProjectTask> query, TaskFilter filter, Guid me, DateOnly today)
    {
        var pics = ParseList(filter.Pic, "pic", value => Guid.TryParse(value, out var id) ? id : throw new ValidationFailedException("pic", "Filter PIC tidak valid."));
        if (pics.Count > 0)
        {
            query = query.Where(t => t.Assignees.Any(a => pics.Contains(a.UserId)));
        }

        var statuses = ParseList(filter.Status, "status", value => Validate.Enum<WorkStatus>("status", value, "Status"));
        if (statuses.Count > 0)
        {
            query = query.Where(t => statuses.Contains(t.Status));
        }

        var priorities = ParseList(filter.Priority, "priority", value => Validate.Enum<Priority>("priority", value, "Prioritas"));
        if (priorities.Count > 0)
        {
            query = query.Where(t => priorities.Contains(t.Priority));
        }

        var labels = ParseList(filter.Label, "label", value => value.ToLowerInvariant());
        if (labels.Count > 0)
        {
            query = query.Where(t => t.Labels.Any(l => labels.Contains(l.Label!.NormalizedName)));
        }

        if (filter.Overdue == true)
        {
            query = query.Where(t => t.DueDate < today && t.Status != WorkStatus.Done && t.Status != WorkStatus.Rutin);
        }

        if (filter.ThisWeek == true)
        {
            var friday = TaskRules.EndOfWorkWeek(today);
            query = query.Where(t => t.DueDate >= today && t.DueDate <= friday && t.Status != WorkStatus.Done);
        }

        if (filter.Mine == true)
        {
            query = query.Where(t => t.Assignees.Any(a => a.UserId == me));
        }

        var q = filter.Q?.Trim();
        if (!string.IsNullOrEmpty(q))
        {
            if (q.Length > 100)
            {
                throw new ValidationFailedException("q", "Kata pencarian maksimal 100 karakter.");
            }

            var pattern = $"%{EscapeLike(q)}%";
            var numberMatch = NumberSearchPattern().Match(q);
            var number = numberMatch.Success ? int.Parse(numberMatch.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture) : (int?)null;
            query = query.Where(t =>
                EF.Functions.ILike(t.Title, pattern, "\\")
                || t.Labels.Any(l => EF.Functions.ILike(l.Label!.Name, pattern, "\\"))
                || (number != null && t.Number == number));
        }

        return query;
    }

    private static List<T> ParseList<T>(string? raw, string field, Func<string, T> parse)
    {
        var parts = (raw ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct().ToList();
        if (parts.Count > MaxFilterValues)
        {
            throw new ValidationFailedException(field, "Terlalu banyak nilai filter.");
        }

        return [.. parts.Select(parse)];
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);

    // ---------- mencari ----------

    private static async Task<Project> ActiveProjectAsync(AppDbContext db, Guid id, CancellationToken ct) =>
        await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == id && p.ArchivedAt == null, ct) ?? throw new NotFoundException();

    /// <summary>Kunci task: id (GUID) atau "SEN-115".</summary>
    private static async Task<ProjectTask> FindByKeyAsync(AppDbContext db, string key, CancellationToken ct)
    {
        if (Guid.TryParse(key, out var id))
        {
            return await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        }

        var match = KeyPattern().Match(key);
        if (!match.Success)
        {
            throw new NotFoundException();
        }

        var code = match.Groups[1].Value.ToUpperInvariant();
        var number = int.Parse(match.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture);
        var root = await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Code == code && p.ArchivedAt == null, ct) ?? throw new NotFoundException();
        return await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.RootProjectId == root.Id && t.Number == number, ct) ?? throw new NotFoundException();
    }
}

/// <summary>Filter tabel task lewat query string; semua boleh kosong.</summary>
internal sealed record TaskFilter(
    [FromQuery] string? Pic,
    [FromQuery] string? Status,
    [FromQuery] string? Priority,
    [FromQuery] string? Label,
    [FromQuery] bool? Overdue,
    [FromQuery] bool? ThisWeek,
    [FromQuery] bool? Mine,
    [FromQuery] string? Q);
