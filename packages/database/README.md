# Database Package

Prisma ORM schema, migrations, and seed data for FreightClaims v5.

## Schema

The Prisma schema (`prisma/schema.prisma`) defines every table, relationship, and index
in the PostgreSQL database. See [docs/DATABASE.md](../../docs/DATABASE.md) for the full
ER diagram and table descriptions.

## Commands

```bash
# Generate Prisma client (run after schema changes)
pnpm generate

# Create a new migration
pnpm migrate:dev --name your_migration_name

# Apply migrations in production
pnpm migrate

# Seed database with sample data
pnpm seed

# Open Prisma Studio (visual DB browser)
pnpm studio
```
