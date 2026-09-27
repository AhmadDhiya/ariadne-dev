# syntax=docker/dockerfile:1
# Tahap 1: build dengan SDK (versi dikunci, sama dengan global.json)
FROM mcr.microsoft.com/dotnet/sdk:10.0.401 AS build
WORKDIR /src
COPY global.json nuget.config Directory.Build.props Directory.Packages.props ./
COPY src/Ariadne.Api/Ariadne.Api.csproj src/Ariadne.Api/
RUN dotnet restore src/Ariadne.Api/Ariadne.Api.csproj
COPY src/ src/
RUN dotnet publish src/Ariadne.Api/Ariadne.Api.csproj -c Release -o /app --no-restore

# Tahap 2: hanya runtime, tanpa SDK dan tanpa kode sumber
FROM mcr.microsoft.com/dotnet/aspnet:10.0.12 AS runtime
WORKDIR /app
COPY --from=build /app ./
# Berjalan sebagai user non-root bawaan image .NET (pedoman I4)
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Ariadne.Api.dll"]
