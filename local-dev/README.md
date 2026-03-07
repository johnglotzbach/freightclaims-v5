# Local Development Environment

Everything you need to run FreightClaims v5.0 locally without AWS credentials.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- pnpm 9+

## Quick Start

```bash
# 1. Start infrastructure (PostgreSQL, Redis, LocalStack S3, Mailpit)
cd local-dev
docker compose up -d

# 2. Copy local env vars to the root
cp .env.local ../.env

# 3. Set up database (from monorepo root)
cd ..
pnpm db:generate     # Generate Prisma client
pnpm db:push         # Push schema to local PostgreSQL
pnpm db:seed         # Seed with sample data

# 4. Start all services
pnpm dev             # Runs API (4000), Web (3000) concurrently
```

## Services

| Service     | Port  | URL                        | Purpose            |
|-------------|-------|----------------------------|--------------------|
| PostgreSQL  | 5432  | `postgresql://...@localhost:5432` | Main database |
| Redis       | 6379  | `redis://localhost:6379`   | Caching            |
| LocalStack  | 4566  | `http://localhost:4566`    | S3 emulation       |
| Mailpit UI  | 8025  | `http://localhost:8025`    | Email testing UI   |
| Mailpit SMTP| 1025  | `localhost:1025`           | SMTP for dev       |
| API Server  | 4000  | `http://localhost:4000`    | Backend            |
| Web App     | 3000  | `http://localhost:3000`    | Frontend           |
| AI Agent    | 4100  | `http://localhost:4100`    | AI service         |

## Credentials

| Service    | Username | Password              |
|------------|----------|-----------------------|
| PostgreSQL | fc_app   | fc_local_dev_2026     |
| Redis      | -        | (no auth)             |
| LocalStack | test     | test                  |

## Resetting

```bash
# Full reset (drops all data)
docker compose down -v
docker compose up -d
pnpm db:push
pnpm db:seed
```
