# FreightClaims v5 - Backend API

The core REST API powering FreightClaims.com. Built with Express and TypeScript, following a controller/service/repository pattern with Prisma for database access.

## Directory Layout

```
src/
  server.ts          - Express app bootstrap and startup
  config/            - Environment vars, database config, AWS config
  middleware/         - Auth, CORS, rate-limiting, error handling, request logging
  routes/            - Express route definitions (one file per domain)
  controllers/       - Request/response handling (thin layer)
  services/          - Business logic (domain rules, workflows)
  repositories/      - Data access layer (Prisma queries)
  validators/        - Zod schemas for request validation
  types/             - TypeScript interfaces and type definitions
  utils/             - Helper functions (encryption, formatters, dates)
tests/               - Unit and integration tests
```

## Running Locally

```bash
# From monorepo root
pnpm dev:api

# Or from this directory
pnpm dev
```

The API starts at `http://localhost:4000`. All routes are prefixed with `/api/v1/`.

## API Endpoints

See [docs/API.md](../../docs/API.md) for the full endpoint reference.
