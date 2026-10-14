# Deploying RustQuest on Dokploy (Docker Compose)

RustQuest is a pure static SPA — the whole deploy is **one nginx container** that
serves `dist/` **with the security headers the in-browser rustc sandbox needs**
(`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` / CSP, per
[SECURITY.md](./SECURITY.md)). This is the sandbox-capable deploy target —
GitHub Pages cannot send those headers, which is why the Docker path is the one
to use.

## What's in the box

| File | Role |
|---|---|
| `Dockerfile` | 3-stage build: **fetcher** (pinned + SHA-256-verified rustc-wasm assets, 51 MB tarball → 175 MB) → **builder** (`npm ci` + `vite build` + gzip pre-compression) → **runtime** (nginx:1.27-alpine) |
| `docker-compose.yml` | single `web` service, `${PORT:-8080}:80`, healthcheck, `restart: unless-stopped` |
| `nginx.conf` | COOP/COEP/CSP on every response, `gzip_static`, SPA fallbacks for `/` and `/spike/`, 1-year immutable cache for content-hashed `/assets/`, revalidate for `/spike/` |
| `.dockerignore` | keeps `node_modules`, `dist`, and the 175 MB local `public/spike/` out of the build context |

The sandbox assets are **not** in git and **not** taken from your machine — the
`fetcher` stage re-downloads them from the pinned commit and verifies every hash
(`scripts/spike-assets.sha256`), so the image is reproducible from the repo alone.

## Dokploy setup (one-time)

1. **Connect the repo** — in Dokploy: *Git Providers* → GitHub → authorize, so it can see `LawWanFung/rust-and-play`.
2. **Create the service** — your project → **Add Service → Compose**
   - Name: `rustquest`
   - Source: **GitHub** → repo `LawWanFung/rust-and-play` → branch `main`
   - Compose file: `docker-compose.yml` (auto-detected at the repo root)
3. **Environment** — no variables required. Optionally set `PORT` (host port,
   default `8080`) in the service's environment editor — Dokploy writes it to the
   `.env` next to the compose file, which compose interpolates.
4. **Domain** — service → *Domains* tab → add your domain (e.g. `rust.example.com`);
   point a `CNAME` (or `A`) record at the server. Dokploy's Traefik routes to the
   container port for you.
5. **Deploy** — first build takes a few minutes (mostly the 51 MB compiler tarball
   download + the 175 MB gzip pass). Subsequent deploys are much faster: the
   `npm ci` and asset-fetch layers are cached and only rebuild when
   `package*.json` / `scripts/` / source change.

After deploy:

- `https://your-domain/` — the game, **with the live rustc sandbox** (cross-origin
  isolation is served by nginx, so `SharedArrayBuffer` works)
- `https://your-domain/spike/` — the original dev rig

## Local test (same files)

```bash
docker compose up --build
# → http://localhost:8080
```

## Operations notes

- **Re-pinning the compiler assets** (new rustc): update the commit pin in
  `scripts/fetch-spike-assets.mjs` + regenerate `scripts/spike-assets.sha256`
  (`node scripts/gen-asset-hashes.mjs`) + sync `ASSET_HASHES` in
  `src/lib/sandbox/runner-worker.ts` (see SECURITY.md finding 1). The next
  Dokploy deploy picks it up automatically — the fetch layer re-runs when the
  manifest changes.
- **Updates**: push to `main` → Dokploy redeploys; content-hashed `/assets/` are
  cached immutable in browsers, `/spike/` revalidates, so users get the new
  version on next navigation.
- **Logs / health**: `docker compose logs web`; the healthcheck hits `/` every 30 s.
