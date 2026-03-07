# Repositories

Data access layer. Each repository wraps Prisma queries for a specific domain.
Services call repositories -- never Prisma directly. This keeps database queries
isolated and testable (repositories can be mocked in unit tests).

Naming: `{domain}.repository.ts` - exports a singleton object with query methods.
