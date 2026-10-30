using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ariadne.Api.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UbahHapusAktivitas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "deleted_at",
                table: "activities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "edited_at",
                table: "activities",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "activities");

            migrationBuilder.DropColumn(
                name: "edited_at",
                table: "activities");
        }
    }
}
