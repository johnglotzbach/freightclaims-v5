/**
 * Database Configuration - Prisma client singleton with connection pooling
 *
 * Creates and exports a single PrismaClient instance used across the entire API.
 * In development, we store the client on globalThis to prevent hot-reload from
 * creating multiple connections. Connection pool size is configured via env vars
 * (DATABASE_POOL_MIN / DATABASE_POOL_MAX) and appended to the connection URL.
 *
 * Location: apps/api/src/config/database.ts
 * Related: packages/database/prisma/schema.prisma
 */
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Builds the connection URL with pool size parameters.
 * Prisma uses these to configure the underlying connection pool.
 */
function buildDatabaseUrl(): string {
  const base = env.DATABASE_URL;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}connection_limit=${env.DATABASE_POOL_MAX}&pool_timeout=10`;
}

/**
 * Singleton Prisma client. Logs queries in development for debugging,
 * only errors in production to keep logs clean.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    datasources: {
      db: { url: buildDatabaseUrl() },
    },
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma when the process is shutting down.
 * Called from server.ts during graceful shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
