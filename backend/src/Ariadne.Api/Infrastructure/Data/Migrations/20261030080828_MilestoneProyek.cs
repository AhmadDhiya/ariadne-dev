using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ariadne.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MilestoneProyek : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "milestones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    root_project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    is_done = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_milestones", x => x.id);
                    table.ForeignKey(
                        name: "fk_milestones_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_milestones_projects_root_project_id",
                        column: x => x.root_project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_milestones_project_id",
                table: "milestones",
                column: "project_id");

            migrationBuilder.CreateIndex(
                name: "ix_milestones_root_project_id_date",
                table: "milestones",
                columns: new[] { "root_project_id", "date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "milestones");
        }
    }
}
