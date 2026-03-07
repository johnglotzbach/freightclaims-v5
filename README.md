# FreightClaims v5.0

**The best freight claims management platform in the world.**

FreightClaims is the industry-leading SaaS platform for managing the entire freight claim lifecycle — intake, AI-powered document processing, carrier negotiation, compliance tracking, automation workflows, and settlement analytics. Version 5.0 is a ground-up consolidation of the previous 28-repo microservices architecture into a single, modern monorepo — same features, better everything.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend API | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 (Render Managed) |
| ORM | Prisma |
| AI Agents | Custom framework (Google Gemini API) |
| Hosting | Render |
| Storage | Local disk (default) or AWS S3 (optional) |
| Cache | Redis (Render Managed) |
| Auth | JWT with RBAC |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file and fill in values
cp env.example .env

# 3. Start local Postgres + Redis
docker compose up -d

# 4. Generate Prisma client
pnpm db:generate

# 5. Run database migrations
pnpm db:migrate

# 6. Seed database with sample data
pnpm db:seed

# 7. Start all services in dev mode
pnpm dev
```

The frontend runs at `http://localhost:3000`, the API at `http://localhost:4000`, and the AI agent service at `http://localhost:4100`.

## Project Structure

```
freightclaims-v5/
  apps/
    web/          - Next.js frontend (freightclaims.com)
    api/          - Node.js/TypeScript backend API
    ai-agent/     - AI agent system (freightclaims.ai)
  packages/
    shared/       - Shared types, constants, utilities
    database/     - Prisma schema and migrations
  docs/           - Architecture, API, deployment docs
```

## Documentation

Full documentation hub at **[docs/README.md](docs/README.md)**.

| Guide | Description |
|-------|-------------|
| [Developer Setup](docs/guides/DEVELOPER_SETUP.md) | Local environment, Docker, env vars |
| [Deployment Guide](docs/guides/DEPLOYMENT_GUIDE.md) | Production deployment on Render |
| [Infrastructure Buying Guide](docs/guides/INFRASTRUCTURE_BUYING_GUIDE.md) | What to buy, plans, step-by-step |
| [Architecture](docs/architecture/ARCHITECTURE.md) | System design with Mermaid diagrams |
| [Database Schema](docs/architecture/DATABASE_SCHEMA.md) | All 60+ Prisma models |
| [AI Agents](docs/architecture/AI_AGENTS_GUIDE.md) | 13 AI agents, Gemini integration |
| [API Reference](docs/reference/API_REFERENCE.md) | All REST endpoints |
| [Contributing](docs/guides/CONTRIBUTING.md) | Branch naming, PR process |
| [Changelog](docs/CHANGELOG.md) | Release history |

## License

Copyright (c) 2026 FreightClaims.com. All rights reserved. See [LICENSE](LICENSE).
