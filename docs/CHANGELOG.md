# FreightClaims v5.0 - Changelog

**Release Date:** February 2026
**Codename:** Atlas

The biggest release in FreightClaims history. Complete platform rewrite, consolidating 28 separate repositories into a single modern monorepo with AI-powered claim automation.

---

## Breaking Changes

### Architecture

- **28 repos → 1 monorepo**: All microservices consolidated into `freightclaims-v5/` with pnpm workspaces
- **Backend**: .NET/C# → Node.js + TypeScript (Express)
- **Frontend**: Angular → Next.js 14 (App Router) + React 18
- **Database**: MySQL → PostgreSQL 16 (Render Managed)
- **ORM**: Entity Framework → Prisma ORM
- **Styling**: SCSS/Bootstrap → Tailwind CSS v3
- **Hosting**: Multiple hosts → Render (unified)
- **AI Provider**: OpenAI → Google Gemini API

### API Changes

- Base URL changed to `/api/v1/`
- All endpoints now use camelCase in request/response bodies
- Authentication switched from cookie-based to JWT bearer tokens
- Pagination format changed to `{ data, pagination: { page, limit, total, totalPages } }`
- Error format standardized to `{ success: false, message, errors }`

### Database Schema

- All table names converted to snake_case
- UUIDs replace auto-increment integer IDs
- Soft delete (`deleted_at`) added to all major entities
- New tables for AI system (ai_conversations, ai_messages, ai_agent_runs, etc.)
- claim_settings replaces the old configuration tables

---

## New Features

### AI Agent System (freightclaims.ai)

- **Supervisor-Agent Architecture**: Central supervisor routes requests to 7 specialized agents
- **Claim Intake Agent**: Extracts structured data from raw emails, documents, and text input. Auto-detects carrier, PRO, shipper, consignee, amounts, and claim type
- **Missing Documents Agent**: Checks uploaded docs against required categories per claim type, drafts professional follow-up emails with deadlines
- **Legal Compliance Agent**: Full Carmack Amendment encoding — tracks 30-day acknowledgment, 120-day disposition, 9-month filing, and 2yr+1day statute of limitations. Flags violations and creates urgent tasks
- **Carrier Negotiation Agent**: Reads denial letters, identifies defense strategies (packaging, act of God, inherent vice, SL&C, late filing, released value, concealed damage), generates professional rebuttals citing applicable law
- **Claim Valuation Agent**: Predicts settlement ranges based on historical data, carrier behavior, documentation strength, and claim characteristics
- **Status Follow-Up Agent**: Monitors stale claims with escalation ladder (follow-up → formal demand → insurance filing → litigation recommendation)
- **Customer Copilot**: Conversational AI that answers questions about claims, compliance, documents, and industry topics. Maintains conversation history and pulls live claim data
- **Agent Chaining**: Agents can hand off to each other (e.g., Intake → Documents → Compliance) for multi-step workflows
- **Tool System**: 10 database tools agents can invoke (getClaim, searchClaims, checkMissingDocuments, getCarrier, createTask, etc.)
- **Powered by Google Gemini** (`gemini-2.0-flash` by default)

### Frontend

- **Complete UI Redesign**: Professional navy/blue + amber accent theme
- **Dark Mode**: Full dark mode support with system preference detection
- **Dashboard**: Stats cards with real-time claim counts, recent claims table
- **Claims List**: Filterable/searchable table with status badges, pagination
- **Claim Detail**: Tabbed interface (Overview, Parties, Products, Documents, Comments, Tasks, Payments, Timeline) with Carmack compliance alerts
- **New Claim Form**: Multi-step wizard (Basic Info → Parties → Products → Review)
- **AI Copilot Page**: Chat interface with typing indicators and conversation history
- **Responsive Design**: Full mobile/tablet support
- **Loading States**: Skeleton loaders on all data-fetching pages
- **Toast Notifications**: Sonner-based success/error feedback
- **Theme Toggle**: Light/dark mode switcher in the header

### Backend

- **Structured Logging**: Pino with JSON output in production, pretty-print in dev
- **Rate Limiting**: Configurable limits per route group (general API, auth, AI)
- **Input Validation**: Zod schemas on every endpoint
- **Error Handling**: Centralized error handler with sanitized production messages
- **S3 Document Storage**: Upload, download, signed URLs, direct browser uploads
- **AWS Secrets Manager**: Runtime credential retrieval with local caching
- **Connection Pooling**: Configurable Prisma pool size for RDS optimization
- **Two-Tier Cache**: In-memory + Redis caching layer
- **Health Checks**: `/health` and `/ready` endpoints for monitoring
- **Graceful Shutdown**: Clean database disconnect on SIGTERM/SIGINT
- **Compression**: gzip/brotli response compression

### Database

- **30+ Models**: Full schema covering users, customers, claims (8 sub-entities), documents, shipments, carriers, insurance, suppliers, email, notifications, AI, automation, and analytics
- **Comprehensive Indexing**: Indexes on all query-heavy columns
- **Seed Script**: Idempotent seeder with admin user, sample data, carriers, and reference data
- **Prisma Studio**: Visual database browser for development

### DevOps & Infrastructure

- **Render Blueprint**: Single `render.yaml` deploys all 3 services
- **Docker Compose**: Local development stack (PostgreSQL, Redis, LocalStack S3, Mailpit)
- **Environment Validation**: App crashes at startup if required env vars are missing
- **CORS Configuration**: Production-aware origin whitelisting
- **Security Headers**: Helmet.js on all responses

---

## Improvements

### Performance

- **Database queries**: Selective includes, pagination, and cursor-based queries replace full-table loads
- **Connection pooling**: Pool size tuned per RDS instance class
- **Response compression**: All responses gzipped
- **Lazy client creation**: AWS SDK clients created once, reused
- **Cache layer**: Frequently-accessed data cached in memory and Redis

### Security

- **JWT authentication**: Stateless tokens with configurable expiration
- **Role-based access control**: admin, manager, user, viewer roles
- **Input validation**: Every endpoint validates with Zod schemas
- **Error sanitization**: Stack traces and internal details stripped in production
- **Soft deletes**: Data preserved for audit, not permanently removed
- **Encryption**: AES-256 for carrier portal credentials
- **SSL/TLS**: Enforced on all production connections (Render auto-SSL + RDS sslmode=require)

### Developer Experience

- **TypeScript everywhere**: Full type safety across frontend, backend, and shared packages
- **Monorepo**: One `git clone`, one `pnpm install`, everything works
- **Shared package**: Types, constants, and utilities shared between frontend and backend
- **Hot reload**: `tsx watch` for API, Next.js fast refresh for frontend
- **Vitest**: Fast test runner with mocking support
- **Prisma Studio**: Visual DB editor at `pnpm db:studio`
- **Comprehensive docs**: API reference, database schema, AI system, file map, deployment guide

### Code Quality

- **ESLint 9**: Flat config with TypeScript rules
- **Prettier**: Consistent formatting across all files
- **File headers**: Every file has a JSDoc header explaining purpose and location
- **Module READMEs**: Each directory has a README explaining its contents
- **Clear separation of concerns**: routes → controllers → services → repositories

---

## Removed

- All 28 separate GitHub repositories (consolidated into monorepo)
- .NET/C# backend code
- Angular frontend code
- MySQL database
- Bootstrap/SCSS styling
- OpenAI API integration (replaced by Gemini)
- Anthropic API integration
- Cookie-based authentication
- Legacy carrier integration scripts
- Separate admin panel (now part of main dashboard)

---

## Migration Guide

### For Developers

1. Clone the new monorepo
2. Run `pnpm install` at the root
3. Copy `local-dev/.env.local` to `.env`
4. Start Docker: `cd local-dev && docker compose up -d`
5. Set up DB: `pnpm db:generate && pnpm db:push && pnpm db:seed`
6. Start dev: `pnpm dev`

### For Operations

1. Set up Render account and create PostgreSQL database (see `docs/guides/INFRASTRUCTURE_BUYING_GUIDE.md`)
2. Deploy via Render Blueprint (render.yaml)
3. Configure environment variables on each service
4. Configure custom domains
5. Run initial database migration (`prisma db push && prisma db seed`)

### Data Migration

Since the database changed from MySQL to PostgreSQL with a new schema, a data migration script will be needed. Key considerations:
- User passwords need to be re-hashed (bcrypt)
- Integer IDs → UUIDs (mapping table recommended)
- Claims and related entities need to be mapped to new schema
- Documents need S3 key remapping
- Historical email logs should be imported to `email_logs` table

---

## Contributors

- FreightClaims Engineering Team
- AI Agent Framework by FreightClaims R&D

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 5.0.0 | Feb 2026 | Complete platform rewrite (this release) |
| 4.x | 2023-2025 | .NET/Angular microservices (28 repos) |
| 3.x | 2021-2023 | .NET/Angular monolith |
| 2.x | 2019-2021 | PHP/Laravel |
| 1.x | 2017-2019 | Initial WordPress prototype |
