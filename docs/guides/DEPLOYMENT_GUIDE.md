# Deployment Guide

> Production deployment guide for FreightClaims v5 on Render.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Render Setup](#render-setup)
- [Environment Variables](#environment-variables)
- [Database Setup (Render PostgreSQL)](#database-setup-render-postgresql)
- [Running Migrations in Production](#running-migrations-in-production)
- [File Storage](#file-storage)
- [Health Check Endpoints](#health-check-endpoints)
- [Monitoring & Logging](#monitoring--logging)
- [Scaling Considerations](#scaling-considerations)
- [Rollback Procedure](#rollback-procedure)
- [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Render"
        Web["Web Service<br/>Next.js Frontend<br/>freightclaims-web"]
        API["Web Service<br/>Express API<br/>freightclaims-api"]
        AI["Web Service<br/>Python AI Agent<br/>freightclaims-ai"]
        PG["Render PostgreSQL<br/>freightclaims-db"]
        Redis["Render Redis<br/>freightclaims-cache"]
    end

    subgraph "External"
        Gemini["Google Gemini API"]
        S3["AWS S3 (optional)"]
        SMTP["SMTP Provider (optional)"]
    end

    Users["Users"] --> Web
    Web --> API
    API --> AI
    API --> PG
    API --> Redis
    API --> Gemini
    API -.->|"optional"| S3
    API -.->|"optional"| SMTP
    AI --> Gemini
```

### Services Summary

| Service | Platform | Type | Build Command | Start Command |
|---------|----------|------|---------------|---------------|
| **Frontend** | Render | Web Service | `pnpm install && pnpm --filter web build` | `pnpm --filter web start` |
| **API** | Render | Web Service | `pnpm install && pnpm --filter database generate && pnpm --filter api build` | `pnpm --filter api start` |
| **AI Agent** | Render | Web Service | `pip install -r requirements.txt && playwright install chromium` | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| **Database** | Render | PostgreSQL | — | Managed |
| **Cache** | Render | Redis | — | Managed |

---

## Render Setup

### 1. Frontend (Next.js)

Create a **Web Service** on Render:

| Setting | Value |
|---------|-------|
| **Name** | `freightclaims-web` |
| **Region** | Same as your database region |
| **Branch** | `main` |
| **Root Directory** | `freightclaims-v5` |
| **Runtime** | Node |
| **Build Command** | `pnpm install && pnpm --filter web build` |
| **Start Command** | `pnpm --filter web start` |
| **Node Version** | `20` |
| **Plan** | Starter ($7/mo) or higher |

### 2. API (Express)

Create a **Web Service** on Render:

| Setting | Value |
|---------|-------|
| **Name** | `freightclaims-api` |
| **Region** | Same as your database region |
| **Branch** | `main` |
| **Root Directory** | `freightclaims-v5` |
| **Runtime** | Node |
| **Build Command** | `pnpm install && pnpm --filter database generate && pnpm --filter api build` |
| **Start Command** | `pnpm --filter api start` |
| **Node Version** | `20` |
| **Plan** | Starter ($7/mo) or higher |
| **Health Check Path** | `/health` |

### 3. AI Agent (Python)

Create a **Web Service** on Render:

| Setting | Value |
|---------|-------|
| **Name** | `freightclaims-ai` |
| **Region** | Same as your database region |
| **Branch** | `main` |
| **Root Directory** | `freightclaims-v5/apps/ai-agent` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt && playwright install chromium && playwright install-deps` |
| **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| **Python Version** | `3.11` |
| **Plan** | Starter ($7/mo) or higher |
| **Health Check Path** | `/healthz` |

### 4. PostgreSQL Database

Create a **PostgreSQL** database on Render:

| Setting | Value |
|---------|-------|
| **Name** | `freightclaims-db` |
| **Database** | `freightclaims` |
| **User** | `fc_admin` |
| **Region** | Same as all services |
| **Version** | `16` |
| **Plan** | Starter ($7/mo) |

After creation, copy the **Internal Database URL** and set it as `DATABASE_URL` on the API service.

### 5. Redis Cache

Create a **Redis** instance on Render:

| Setting | Value |
|---------|-------|
| **Name** | `freightclaims-cache` |
| **Region** | Same as all services |
| **Plan** | Free (25 MB) |
| **Eviction Policy** | `allkeys-lru` |

Copy the **Internal Redis URL** and set it as `REDIS_URL` on the API service.

---

## Environment Variables

### API Service (`freightclaims-api`)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `4000` | Render assigns its own port via `$PORT` |
| `DATABASE_URL` | *(Internal URL from Render PostgreSQL)* | |
| `JWT_SECRET` | *(generate: `openssl rand -hex 32`)* | 64+ character secret |
| `ENCRYPTION_KEY` | *(generate: `openssl rand -hex 16`)* | 32+ character key |
| `STORAGE_MODE` | `local` | Use `s3` if using AWS S3 |
| `LOCAL_UPLOAD_DIR` | `/opt/render/project/uploads` | Only when STORAGE_MODE=local |
| `GEMINI_API_KEY` | *(Google AI key)* | |
| `AI_MODEL` | `gemini-2.0-flash` | |
| `REDIS_URL` | *(Internal URL from Render Redis)* | |
| `NEXT_PUBLIC_APP_URL` | `https://app.freightclaims.com` | Frontend URL |
| `LOG_FORMAT` | `json` | |
| `LOG_LEVEL` | `info` | |

### Frontend Service (`freightclaims-web`)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `NEXT_PUBLIC_API_URL` | `https://freightclaims-api.onrender.com` | API service URL |
| `NEXT_PUBLIC_APP_URL` | `https://app.freightclaims.com` | Self URL |

### AI Agent Service (`freightclaims-ai`)

| Variable | Value | Notes |
|----------|-------|-------|
| `GEMINI_API_KEY` | *(Google AI key)* | Same as API or separate |
| `AI_MODEL` | `gemini-2.0-flash` | |
| `API_BASE_URL` | `https://freightclaims-api.onrender.com/api/v1` | |

### Generating Secrets

```bash
openssl rand -base64 48
# or
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Database Setup (Render PostgreSQL)

Render PostgreSQL is fully managed. No security groups, no VPC config, no manual backups.

| Feature | Render PostgreSQL |
|---------|------------------|
| **Automatic backups** | Daily, 7-day retention |
| **Encryption** | At rest and in transit |
| **Connection pooling** | Built-in via internal URL |
| **Metrics** | CPU, memory, storage in dashboard |
| **High availability** | Available on Pro plan and above |

### Connection String

Use the **Internal Database URL** from Render's database dashboard. It looks like:

```
postgres://fc_admin:PASSWORD@dpg-abc123:5432/freightclaims
```

Internal URLs route within Render's private network (lower latency, no data transfer fees).

### Initial Setup

After the API deploys with the `DATABASE_URL` set:

1. Go to Render → `freightclaims-api` → **Shell** tab
2. Run:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

---

## Running Migrations in Production

### Option 1: Render Build Command (Recommended)

Include migrations in the API build step:

```bash
pnpm install && pnpm --filter database generate && npx prisma migrate deploy && pnpm --filter api build
```

This runs `prisma migrate deploy` during each deployment.

### Option 2: Render Shell

Use Render's Shell tab for the API service:

```bash
npx prisma migrate deploy
```

### Migration Safety

- `prisma migrate deploy` only applies **pending** migrations — never generates new ones
- Migrations are sequential and tracked in `_prisma_migrations`
- Failed migrations are rolled back automatically
- Always test migrations on a staging database first

---

## File Storage

### Default: Local Disk (`STORAGE_MODE=local`)

Files are stored on the Render service's disk at `LOCAL_UPLOAD_DIR`. Suitable for testing and low-volume production use.

**Limitations:**
- Disk is ephemeral on free/starter plans (files survive redeploys but not infrastructure changes)
- Not shared between multiple API instances
- Add a Render Disk ($0.25/GB/month) for persistence if needed

### Production: AWS S3 (`STORAGE_MODE=s3`)

For production with heavy file uploads, switch to S3:

1. Set `STORAGE_MODE=s3` on the API service
2. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_DOCUMENTS_BUCKET`

---

## Health Check Endpoints

### API

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Liveness | `{ "status": "ok" }` |
| `GET /ready` | Readiness | `{ "status": "ready", "database": "connected" }` |

### AI Agent

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /healthz` | Liveness | `200 OK` |

### Frontend

Next.js serves its own health implicitly via the root route.

---

## Monitoring & Logging

### Render Dashboard

All services write structured logs visible in the Render dashboard:

- **API**: Pino JSON logs with request/response timing, error traces
- **Frontend**: Next.js build and runtime logs
- **AI Agent**: Uvicorn access logs and Python application logs

### Database Metrics

Render PostgreSQL dashboard shows:
- Active connections
- CPU and memory usage
- Storage used
- Query performance

### Log Levels

Set via `LOG_LEVEL` on the API service:

| Level | Use Case |
|-------|----------|
| `error` | Production minimum |
| `warn` | Recommended production |
| `info` | Default — includes request logging |
| `debug` | Troubleshooting only |

### External Monitoring (Recommended)

- **Uptime**: UptimeRobot or Better Uptime — monitor `/health` every 60s
- **Errors**: Sentry — add `@sentry/node` for real-time error alerts

---

## Scaling Considerations

### API Service

| Approach | When | How |
|----------|------|-----|
| Vertical | Response times increasing | Upgrade Render plan |
| Horizontal | High concurrent traffic | Add instances in Render |
| Caching | Repeated queries | Ensure Redis connected; increase TTLs |

### Database

| Approach | When | How |
|----------|------|-----|
| Vertical | CPU/memory pressure | Upgrade Render PostgreSQL plan |
| Read replicas | Read-heavy workload | Available on Render Pro plan |
| Connection pooling | Too many connections | Use Prisma's built-in pool |

### AI Agent

| Approach | When | How |
|----------|------|-----|
| Memory | Browser automation OOM | Upgrade plan (Playwright needs ~512MB) |
| Workers | Queue of requests | `uvicorn app:app --workers 2` |

---

## Rollback Procedure

### Application Rollback

Render supports instant rollbacks:

1. Go to the service → **Events** tab
2. Find the last good deployment
3. Click **Rollback to this deploy**

### Database Rollback

Render PostgreSQL has automatic daily backups:

1. Go to your database → **Backups** tab
2. Click **Restore** on the backup you want

For point-in-time recovery, upgrade to the Pro plan.

### Best Practice

Always make migrations additive:
- **Add** columns as nullable
- **Deprecate** before removing
- **Deploy in phases** for breaking changes

---

## Deployment Checklist

### Pre-Deployment

- [ ] All changes merged to `main` and CI passing
- [ ] Database migrations tested
- [ ] Environment variables added/updated on Render
- [ ] No secrets in committed code

### Deployment

- [ ] Deploy API service first
- [ ] Verify API health: `curl https://api.freightclaims.com/health`
- [ ] Deploy frontend
- [ ] Verify frontend loads
- [ ] Deploy AI agent (if changed)

### Post-Deployment

- [ ] Smoke test: Login, view claims, create a claim, upload a document
- [ ] Check Render logs for errors
- [ ] Monitor error rates for 15 minutes
- [ ] Verify AI copilot responds
