using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Ariadne.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AktivitasDanMention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "activities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    seq = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    task_id = table.Column<Guid>(type: "uuid", nullable: false),
                    root_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: true),
                    log_kind = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    data = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_activities", x => x.id);
                    table.CheckConstraint("ck_activities_shape", "(kind = 'Log' AND log_kind IS NOT NULL AND body IS NULL) OR (kind <> 'Log' AND log_kind IS NULL AND data IS NULL AND body IS NOT NULL AND length(btrim(body)) > 0)");
                    table.ForeignKey(
                        name: "fk_activities_projects_root_project_id",
                        column: x => x.root_project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_activities_tasks_task_id",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_activities_users_author_id",
                        column: x => x.author_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "mentions",
                columns: table => new
                {
                    activity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_mentions", x => new { x.activity_id, x.user_id });
                    table.ForeignKey(
                        name: "fk_mentions_activities_activity_id",
                        column: x => x.activity_id,
                        principalTable: "activities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_mentions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_activities_author_id",
                table: "activities",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "ix_activities_root_project_id",
                table: "activities",
                column: "root_project_id");

            migrationBuilder.CreateIndex(
                name: "ix_activities_seq",
                table: "activities",
                column: "seq",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_activities_task_id_kind_created_at",
                table: "activities",
                columns: new[] { "task_id", "kind", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_activities_task_id_seq",
                table: "activities",
                columns: new[] { "task_id", "seq" });

            migrationBuilder.CreateIndex(
                name: "ix_mentions_user_id",
                table: "mentions",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "mentions");

            migrationBuilder.DropTable(
                name: "activities");
        }
    }
}
