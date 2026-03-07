# Developer Setup Guide

> Complete guide to setting up your local development environment for FreightClaims v5.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone & Install](#clone--install)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running Services Locally](#running-services-locally)
- [IDE Setup](#ide-setup)
- [Debugging Tips](#debugging-tips)
- [Common Issues & Fixes](#common-issues--fixes)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.0+ | Runtime for API and web apps |
| **pnpm** | 9.0+ | Workspace-aware package manager |
| **Docker** & **Docker Compose** | Latest | Local PostgreSQL, Redis, Mailpit |
| **Python** | 3.11+ | AI browser agent (FastAPI + Playwright) |
| **Git** | Latest | Version control |

### Install Prerequisites

```bash
# Node.js (via nvm)
nvm install 20
nvm use 20

# pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Verify versions
node -v   # v20.x.x
pnpm -v   # 9.x.x
python3 --version  # 3.11+
docker --version
```

---

## Clone & Install

```bash
# Clone the repository
git clone <repo-url> freightclaims-v5
cd freightclaims-v5

# Install all workspace dependencies
pnpm install

# Generate the Prisma client
pnpm db:generate
```

The monorepo uses **pnpm workspaces** defined in `pnpm-workspace.yaml`:

```
packages:
  - "apps/*"
  - "packages/*"
```

This means `pnpm install` at the root installs dependencies for all apps and packages.

---

## Environment Variables

Copy the example environment file and fill in the values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://freightclaims:localdev123@localhost:5432/freightclaims?sslmode=prefer` |
| `JWT_SECRET` | Secret for signing access tokens | Any secure random string (64+ chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Different secure random string |
| `JWT_EXPIRY` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` |

### Storage & Email

| Variable | Description | Local Dev Value |
|----------|-------------|-----------------|
| `STORAGE_MODE` | File storage backend | `local` |
| `LOCAL_UPLOAD_DIR` | Directory for uploaded files | `./uploads` |
| `SMTP_HOST` | SMTP server for email | `localhost` (Mailpit) |
| `SMTP_PORT` | SMTP port | `1025` (Mailpit) |
| `EMAIL_FROM` | From address for emails | `claims@freightclaims.com` |

> **Note:** AWS (S3, SES) is not needed for local development. Files are stored on disk and emails go to Mailpit.

### AI & External Services

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Get from [Google AI Studio](https://aistudio.google.com/) |
| `AI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `AI_AGENT_URL` | Python AI agent service URL | `http://localhost:8000` |

### Frontend

| Variable | Description | Local Dev Value |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_API_URL` | API base URL for the frontend | `http://localhost:4000` |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | `http://localhost:3000` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SMTP_HOST` | SMTP server for dev email | `localhost` (Mailpit) |
| `SMTP_PORT` | SMTP port | `1025` (Mailpit) |
| `LOG_LEVEL` | Pino log level | `info` |

---

## Database Setup

### 1. Start Local Services with Docker

The root `docker-compose.yml` starts all required local services:

```bash
docker compose up -d
```

This starts:

| Service | Port | Credentials |
|---------|------|-------------|
| **PostgreSQL 16** | 5432 | `freightclaims` / `localdev123`, database: `freightclaims` |
| **Redis 7** | 6379 | No auth |
| **Mailpit** (email) | 8025 (UI), 1025 (SMTP) | — |

### 2. Run Migrations

```bash
# From the project root
pnpm db:migrate
```

This runs `prisma migrate deploy` in the `packages/database` workspace, applying all migrations to your local database.

For creating new migrations during development:

```bash
pnpm --filter database prisma migrate dev --name describe_your_change
```

### 3. Seed the Database

```bash
pnpm db:seed
```

This creates:

- **26 permissions** across 10 modules (claims, documents, customers, shipments, reports, AI, settings, admin, email, automation)
- **5 roles**: Super Admin, Admin, Manager, Claims Handler, Viewer
- **1 corporate tenant**: FreightClaims Platform (`FC-PLATFORM`)
- **1 demo customer**: Demo Logistics Corp (`DEMO-001`)
- **2 users**:
  - `admin@freightclaims.com` / `admin123!` (Super Admin)
  - `demo@freightclaims.com` / `demo123!` (Claims Handler)
- **12 carriers** (SEFL, XPOL, ODFL, FXFE, EXLA, ABFS, SAIA, RLCA, RDWY, AACT, DAFG, HMES)
- **11 document categories** with required-document mappings per claim type
- **3 countries** (US, CA, MX)

### 4. Explore the Database

```bash
pnpm db:studio
```

Opens Prisma Studio at `http://localhost:5555` for a visual database browser.

---

## Running Services Locally

### All Services (Parallel)

```bash
pnpm dev
```

This runs all apps in parallel using `pnpm --parallel --filter './apps/*' dev`.

### Individual Services

```bash
# API server (Express, port 4000)
pnpm dev:api

# Web frontend (Next.js, port 3000)
pnpm dev:web

# AI agent (Python FastAPI, port 8000)
pnpm dev:ai
```

### Python AI Agent (Manual)

If `pnpm dev:ai` doesn't work, start the Python agent manually:

```bash
cd apps/ai-agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Copy and configure environment
cp env.example .env

# Run the service
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Verify Everything Is Running

| Service | URL | Health Check |
|---------|-----|-------------|
| API | http://localhost:4000 | `GET /health` → `{ status: "ok" }` |
| API (ready) | http://localhost:4000 | `GET /ready` → `{ status: "ready", database: "connected" }` |
| Web | http://localhost:3000 | Open in browser |
| AI Agent | http://localhost:8000 | `GET /healthz` |
| Prisma Studio | http://localhost:5555 | Open in browser |
| Mailpit UI | http://localhost:8025 | Open in browser |

---

## IDE Setup

### VS Code (Recommended)

Install these extensions for the best development experience:

| Extension | ID | Purpose |
|-----------|----|---------|
| **Prisma** | `Prisma.prisma` | Syntax highlighting, formatting, and IntelliSense for `.prisma` files |
| **ESLint** | `dbaeumer.vscode-eslint` | Linting with the project's ESLint flat config |
| **Prettier** | `esbenp.prettier-vscode` | Code formatting (semicolons, single quotes, trailing commas) |
| **Tailwind CSS IntelliSense** | `bradlc.vscode-tailwindcss` | Autocomplete for Tailwind classes in the frontend |
| **TypeScript Importer** | `pmneo.tsimporter` | Auto-import TypeScript symbols |
| **Python** | `ms-python.python` | Python support for the AI agent |
| **Docker** | `ms-azuretools.vscode-docker` | Docker Compose management |

### Recommended VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Debugging Tips

### API Server

1. **Use the built-in Pino logger** — structured JSON logs are output to the console. Set `LOG_LEVEL=debug` in `.env` for verbose output.

2. **VS Code debugger** — add this launch configuration to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:api"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

3. **Prisma query logging** — add `log: ['query']` to the Prisma client initialization to see all SQL queries.

### Frontend

1. **React DevTools** — install the browser extension for component tree inspection and state debugging.
2. **TanStack Query DevTools** — enabled in development by default; look for the floating icon in the bottom-right corner.
3. **Network tab** — use browser DevTools to inspect API calls to `http://localhost:4000/api/v1/`.

### Database

```bash
# Open Prisma Studio for visual debugging
pnpm db:studio

# Or connect directly via psql
docker exec -it fc-postgres psql -U fc_app -d fc_development
```

### AI Agent

```bash
# Check the Python agent logs (runs on port 8000)
# Test the health endpoint
curl http://localhost:8000/healthz

# Send a test request
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"auth": {...}, "scacCode": "SEFL", "data": {...}}'
```

---

## Common Issues & Fixes

### `pnpm install` fails with workspace protocol errors

```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
```

**Fix**: Make sure you're running `pnpm install` from the **project root**, not from inside an individual app.

### Prisma client not generated

```
Error: @prisma/client did not initialize yet
```

**Fix**: Run `pnpm db:generate` to generate the Prisma client after cloning or after schema changes.

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Fix**: Ensure Docker containers are running:

```bash
cd local-dev && docker compose up -d
docker compose ps  # Check all services are "Up"
```

### Port already in use

```
Error: listen EADDRINUSE :::4000
```

**Fix**: Kill the process occupying the port:

```bash
# Find the process
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill it
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Migrations out of sync

```
Error: The migration ... was modified after it was applied
```

**Fix**: Reset the local database (destroys all data):

```bash
pnpm --filter database prisma migrate reset
```

### Python AI agent — Playwright not installed

```
playwright._impl._errors.Error: Executable doesn't exist
```

**Fix**:

```bash
cd apps/ai-agent
playwright install chromium
```

### `NEXT_PUBLIC_*` env vars not loading

Next.js only embeds `NEXT_PUBLIC_` prefixed variables at **build time**.

**Fix**: Restart the dev server after changing any `NEXT_PUBLIC_*` variable:

```bash
pnpm dev:web
```

### Redis connection warnings

If Redis isn't running, the API falls back to in-memory caching automatically. The warnings are safe to ignore in development. To silence them, start Redis:

```bash
cd local-dev && docker compose up redis -d
```

### TypeScript path resolution errors in IDE

**Fix**: Ensure your IDE uses the workspace TypeScript version:

1. Open any `.ts` file
2. Click the TypeScript version in the status bar
3. Select "Use Workspace Version"
