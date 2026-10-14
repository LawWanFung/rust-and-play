# ── RustQuest ────────────────────────────────────────────────────────────
# Multi-stage build:
#   1. fetcher  — downloads the PINNED, hash-verified rustc-wasm spike assets
#                 (51 MB tarball → 175 MB) into public/spike/
#   2. builder  — npm ci + vite build (tsc typecheck) + gzip pre-compression
#   3. runtime  — nginx serving dist/ with the security headers the
#                 in-browser sandbox requires (COOP/COEP/CSP — SECURITY.md)
#
# The final image is ~300 MB: mostly the 175 MB compiler + its .gz twins.

# ── 1. pinned sandbox assets ─────────────────────────────────────────────
FROM node:22-alpine AS fetcher
RUN apk add --no-cache curl tar
WORKDIR /app
# Only the files the fetch script reads — this layer stays cached until the
# pin (manifest) or the script itself changes
COPY package.json package-lock.json ./
COPY scripts/ ./scripts/
RUN node scripts/fetch-spike-assets.mjs
# → /app/public/spike/{rustc.wasm,sysroot/...}

# ── 2. build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Overlay the pinned assets fetched above (public/spike is .dockerignored,
# so this is the only source of the 175 MB)
COPY --from=fetcher /app/public/spike ./public/spike
RUN npm run build
# Pre-compress everything (vite emits no .gz): nginx's gzip_static then
# serves these without re-compressing — the one-time ~180 MB sandbox
# download shrinks to roughly a third and costs the server zero CPU.
RUN find dist -type f -exec gzip -9 -k {} +

# ── 3. runtime ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
# Security headers (COOP/COEP/CSP) + SPA routing + cache policy
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
