import { PrismaClient } from '../generated/client/index.js';

export * from '../generated/client/index.js';

/**
 * Single PrismaClient per process. Re-using the instance across hot reloads
 * avoids exhausting the Postgres connection pool in dev.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
