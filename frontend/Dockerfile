# syntax=docker/dockerfile:1
# Tahap 1: build frontend (versi Node dikunci)
FROM node:24.21.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# npm ci memakai package-lock.json persis; .npmrc mematikan skrip install paket
RUN npm ci
COPY . .
RUN npm run build

# Tahap 2: hanya nginx + file hasil build, berjalan sebagai user non-root (pedoman I4)
FROM nginxinc/nginx-unprivileged:1.30.5-alpine AS runtime
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
