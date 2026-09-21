# CropWatch Liberia Deployment Guide

## Prerequisites

Ensure all required environment variables described in `.env.example` are set in your deployment
environment. `JWT_SECRET` is strictly required and the app will refuse to start without it.

## 1. Database & Seed Data

CropWatch Liberia uses a local SQLite database by default (`data/cropwatch.db`), accessed via
Node's built-in `node:sqlite` module. The schema and seed data (such as user accounts and initial
crops) are created **automatically on first run** by the application server. You do not need to
run manual migration or seeding scripts.

**Node version requirement:** the app's ORM layer (`drizzle-orm`'s `node-sqlite` dialect) calls
`StatementSync.prototype.setReturnArrays()`, a `node:sqlite` method Node's own docs list as
`added: v24.0.0` -- but which is also present (evidently backported) on at least Node 22.22.x.
It is confirmed **absent on Node 22.14.0**, which caused every database query to throw
`TypeError: stmt.setReturnArrays is not a function` and crash the server on every request that
touched the database (including login) in production. This repo pins `.node-version` to `22.22.0`
-- a version verified end-to-end against this exact codebase -- as the floor. If you ever change
this pin, verify `stmt.setReturnArrays` actually exists on the target version first:
```
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(':memory:'); console.log(typeof db.prepare('SELECT 1').setReturnArrays)"
```
This should print `function`, not `undefined`. Note that `.github/workflows/ci.yml` already runs
on Node 24 -- which is why CI never caught this: production and CI were silently running different
Node versions. Consider keeping them aligned going forward.

**Persistence warning:** Render's default filesystem is **ephemeral** -- every deploy, restart, or
scaling event wipes anything written to local disk, including `data/cropwatch.db`. This means, by
default, all farmer/expert accounts and observations are lost on every redeploy. Options:
- Attach a Render persistent **Disk** (requires a paid instance plan, not the Free tier) mounted at
  the app's `data/` directory. See the commented-out `disk:` block in `render.yaml` -- confirm the
  correct absolute path from a Render shell session (`pwd` while in the deployed app directory)
  before enabling it.
- Accept this as expected behavior for a demo/pilot deployment.
- Use the already-supported Supabase integration (`SUPABASE_URL` / `SUPABASE_ANON_KEY`, etc.) for
  anything that needs to survive redeploys, since Supabase-backed data lives outside the container.

## 2. Deploying to Render.com

### Option A: One-click Blueprint (recommended)

This repo includes a `render.yaml` Blueprint. In the Render Dashboard, choose **New > Blueprint**,
point it at this repository, and Render will read `render.yaml` and configure the service's build
command, start command, health check path, and Node version automatically. You'll still need to
fill in the secret values (`JWT_SECRET`, `GEMINI_API_KEY`, etc.) in the dashboard -- they are
declared in `render.yaml` with `sync: false` specifically so Render prompts for them without ever
storing real values in git.

### Option B: Manual Web Service setup

1. **New > Web Service**, connect this repository.
2. **Build Command:** `npm ci && npm run build`
   (`npm ci` is used over `npm install` for reproducible builds from the committed lockfile.)
3. **Start Command:** `npm start`
4. **Health Check Path:** `/api/health` (already implemented in `server.ts`; set this in the
   service's Settings so Render can tell the deploy actually succeeded, not just that it built).
5. Set environment variables under the **Environment** tab (see `.env.example` for the full list,
   or use "Add from .env" to bulk-import a local `.env` file -- never commit that file).
6. Set `NODE_VERSION` to `22.14.0` (or rely on the committed `.node-version` file, which Render
   reads automatically) to guarantee `node:sqlite` availability.

### Why this matters: things that previously caused failed/broken deploys here

- **The server used to hardcode port 3000** instead of reading Render's dynamically-assigned
  `PORT` environment variable. Render's port-scan would time out waiting for a listener on its
  assigned port, and the deploy would be marked failed. This is now fixed in `server.ts`
  (`process.env.PORT` is read first, falling back to 3000 only for local dev).
- **No pinned Node version** meant the app could land on whatever Node version Render defaults to
  for new services at the time. A pin to `22.14.0` specifically was tried and failed in production:
  `drizzle-orm`'s SQLite driver calls a `node:sqlite` method not present at that exact patch,
  crashing the server on every database query (including login) with
  `TypeError: stmt.setReturnArrays is not a function`. Now pinned to `22.22.0`, verified working
  end-to-end.

## 3. Verifying a successful deploy

After deploying, check:
- Render's build logs show the correct Node version (matching `.node-version`).
- Render's deploy logs show `🌾 CropWatch Liberia server running on http://0.0.0.0:<PORT>` with
  `<PORT>` matching what Render assigned (not always 3000).
- `https://<your-service>.onrender.com/api/health` returns `{"status":"ok", ...}`.
- The app's own startup check throws a clear error naming any missing required variable
  (`JWT_SECRET`, `GEMINI_API_KEY`) rather than failing silently.

## 4. Other supported platforms

Because CropWatch Liberia is a full-stack application with a Node.js Express backend (handling
authentication, AI integration, and database operations), it **cannot** be deployed to static file
hosts like GitHub Pages. Any Node.js-capable platform works (Fly.io, Railway, Google Cloud Run,
etc.) using the same build/start commands as above -- just confirm each platform's port-binding
and Node-version-pinning conventions, since they aren't identical to Render's.
