# Contributing Guide

> Guidelines for contributing to the FreightClaims v5 monorepo.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Review Checklist](#review-checklist)
- [Project Structure Reference](#project-structure-reference)

---

## Getting Started

1. Complete the [Developer Setup](./DEVELOPER_SETUP.md) guide.
2. Read the [Architecture Overview](./ARCHITECTURE.md) to understand the system design.
3. Make sure all services run locally and the seed data is loaded.
4. Create a branch from `main` following the naming convention below.

---

## Branch Naming

Use the following prefixes based on the type of change:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New feature or capability | `feature/bulk-claim-export` |
| `fix/` | Bug fix | `fix/jwt-refresh-token-expiry` |
| `docs/` | Documentation changes | `docs/update-api-reference` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/claims-service-split` |
| `chore/` | Build, CI, dependencies, tooling | `chore/upgrade-prisma-6.4` |
| `test/` | Test additions or fixes | `test/claims-controller-coverage` |
| `hotfix/` | Critical production fix | `hotfix/auth-middleware-crash` |

Rules:

- Use lowercase, hyphen-separated names.
- Keep branch names concise but descriptive.
- Include a ticket/issue number if available: `feature/FC-123-bulk-claim-export`.

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring (no behavior change) |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build, CI, dependency updates |
| `revert` | Reverting a previous commit |

### Scopes

| Scope | Package/App |
|-------|-------------|
| `api` | `apps/api` |
| `web` | `apps/web` |
| `ai` | `apps/ai-agent` |
| `db` | `packages/database` |
| `shared` | `packages/shared` |
| `docs` | Documentation |
| `ci` | CI/CD pipeline |

### Examples

```
feat(api): add bulk claim export endpoint

Adds GET /api/v1/reports/export/claims with CSV and Excel support.
Includes date range filtering and tenant scoping.
```

```
fix(web): prevent stale cache on claim status update

Invalidate TanStack Query cache after mutation to
ensure the claims list reflects the latest status.

Closes #142
```

```
chore(db): upgrade Prisma to 6.4.0

Updates @prisma/client and prisma dev dependency.
Regenerates client with new features.
```

---

## Pull Request Process

### Before Opening a PR

1. **Rebase on main**: Ensure your branch is up to date.

```bash
git fetch origin
git rebase origin/main
```

2. **Run linting**: Fix all lint errors.

```bash
pnpm lint
```

3. **Run formatting**: Ensure code is formatted.

```bash
pnpm format
```

4. **Run tests**: Make sure existing tests pass.

```bash
pnpm test
```

5. **Test locally**: Verify your changes work end-to-end with `pnpm dev`.

6. **Generate Prisma client**: If you changed the schema.

```bash
pnpm db:generate
```

### PR Template

When opening a PR, include:

```markdown
## What

Brief description of what this PR does.

## Why

Context on why this change is needed.

## How

High-level description of the approach taken.

## Testing

- [ ] Tested locally with `pnpm dev`
- [ ] API endpoints tested (curl/Postman/Thunder Client)
- [ ] Frontend flows verified in browser
- [ ] Existing tests pass
- [ ] New tests added (if applicable)

## Screenshots

(If frontend changes, include before/after screenshots)

## Related

- Closes #issue_number
- Related to #other_issue
```

### Review Process

1. Open a PR against `main`.
2. Assign at least one reviewer.
3. Address all review comments.
4. Ensure CI checks pass (lint, type-check, tests).
5. Squash and merge when approved.

---

## Code Style

### Formatter: Prettier

Configuration (`.prettierrc`):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

Run formatting:

```bash
pnpm format
```

### Linter: ESLint

Configuration (`eslint.config.mjs`) — ESLint 9 flat config:

- **Parser**: `@typescript-eslint/parser`
- **Key rules**:
  - `no-unused-vars`: warn
  - `@typescript-eslint/no-explicit-any`: warn
  - `prefer-const`: error
  - `eqeqeq`: error (always use `===`)

Run linting:

```bash
pnpm lint
```

### TypeScript

- **Target**: ES2022
- **Module**: ESNext
- **Strict mode**: Enabled
- Declaration maps enabled for cross-package references.

### General Guidelines

- **Naming**: camelCase for variables/functions, PascalCase for types/classes/components, UPPER_SNAKE_CASE for constants.
- **Imports**: Use relative paths within a package. Use workspace package names (`shared`, `database`) for cross-package imports.
- **Error handling**: Always use try/catch in controllers. Services should throw typed errors. Let the global error handler format the response.
- **Validation**: Use Zod schemas for all request validation. Define schemas in `validators/` directory.
- **Comments**: Only add comments for non-obvious logic. Never add "what" comments — the code should be self-documenting.
- **File organization**: One export per file where practical. Group related files in directories.

### API Conventions

- Use RESTful naming: nouns for resources, HTTP verbs for actions.
- Always return `{ success: boolean, data: T }` format.
- Use pagination for list endpoints: `{ page, limit, total }`.
- Include tenant filtering via `tenantFilter(req)` in every repository query.
- Validate all inputs with Zod before processing.

### Frontend Conventions

- Use Next.js App Router conventions (page.tsx, layout.tsx, loading.tsx, error.tsx).
- Server components by default; add `'use client'` only when needed.
- Use TanStack Query for all API data fetching.
- Use Zustand only for truly global client state (auth).
- Use React Hook Form + Zod for form handling.
- Use Tailwind CSS for styling — no CSS modules or styled-components.

---

## Testing

### Running Tests

```bash
# All tests
pnpm test

# API tests only
pnpm --filter api test

# Watch mode (during development)
pnpm --filter api test -- --watch
```

### Test Framework

- **API**: Vitest
- **Web**: (Follow Next.js testing conventions if applicable)

### What to Test

| Priority | What | How |
|----------|------|-----|
| High | Service business logic | Unit tests with mocked Prisma client |
| High | API endpoint behavior | Integration tests with supertest |
| Medium | Validation schemas | Unit tests for Zod schemas |
| Medium | Middleware | Unit tests (auth, tenant, permissions) |
| Low | Utility functions | Unit tests |
| Low | AI agent logic | Integration tests with mocked Gemini responses |

### Test Expectations

- **New features**: Include tests for the primary happy path and at least one error case.
- **Bug fixes**: Include a test that reproduces the bug (fails before fix, passes after).
- **Refactors**: Existing tests should continue to pass without modification.
- **Database changes**: Test that migrations apply and rollback cleanly.

### Test File Naming

Place test files next to the source file:

```
src/services/claims.service.ts
src/services/claims.service.test.ts
```

Or in a `__tests__` directory:

```
src/services/__tests__/claims.service.test.ts
```

---

## Review Checklist

Use this checklist when reviewing PRs:

### Code Quality

- [ ] Code is readable and follows project conventions
- [ ] No unnecessary `any` types (prefer proper typing)
- [ ] No commented-out code left behind
- [ ] No debug `console.log` statements (use Pino logger)
- [ ] Error handling is appropriate (no swallowed errors)
- [ ] No hardcoded secrets or credentials

### Architecture

- [ ] Changes follow the controller/service/repository pattern
- [ ] Multi-tenancy is maintained (queries include `corporateId` filter)
- [ ] New endpoints have proper auth and permission checks
- [ ] Validation is done via Zod schemas
- [ ] API response follows `{ success, data }` format

### Database

- [ ] Schema changes include a migration file
- [ ] New columns have appropriate defaults and nullability
- [ ] Indexes are added for frequently queried columns
- [ ] `corporateId` is included on tenant-scoped models
- [ ] Seed script is updated if new reference data is needed

### Security

- [ ] Authentication is required on non-public endpoints
- [ ] Authorization checks (role/permission) are appropriate
- [ ] User input is validated and sanitized
- [ ] No SQL injection risks (using Prisma parameterized queries)
- [ ] Sensitive data is not logged or exposed in responses
- [ ] Rate limiting is applied to sensitive endpoints

### Frontend

- [ ] Components are responsive
- [ ] Loading and error states are handled
- [ ] TanStack Query cache is invalidated after mutations
- [ ] Forms use React Hook Form + Zod validation
- [ ] Accessibility basics (labels, alt text, keyboard navigation)
- [ ] No hardcoded API URLs (use `NEXT_PUBLIC_API_URL`)

### Testing & Documentation

- [ ] Tests pass locally
- [ ] New functionality has test coverage
- [ ] API changes are reflected in API_REFERENCE.md
- [ ] Schema changes are reflected in DATABASE_SCHEMA.md

---

## Project Structure Reference

```
freightclaims-v5/
├── apps/
│   ├── api/         → Express REST API
│   ├── web/         → Next.js frontend
│   └── ai-agent/    → Python browser agent
├── packages/
│   ├── database/    → Prisma schema + migrations
│   └── shared/      → Shared types + constants
├── local-dev/       → Docker Compose for local services
├── docs/            → This documentation
└── (root configs)   → package.json, tsconfig, eslint, prettier
```

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).
