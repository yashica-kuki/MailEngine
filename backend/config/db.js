require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// ─────────────────────────────────────────────
// Prisma 7 requires an explicit driver adapter.
// We create a pg connection pool, wrap it with
// PrismaPg, then pass it to PrismaClient.
// ─────────────────────────────────────────────

// Singleton pool — reuse across hot reloads in dev
const globalForPrisma = global;

let prisma;

if (globalForPrisma.__prisma) {
  prisma = globalForPrisma.__prisma;
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  const adapter = new PrismaPg(pool);

  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__prisma = prisma;
  }
}

/**
 * connectDB — tests the Prisma connection on startup.
 * Called once from server.js.
 */
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL via Prisma!');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { prisma, connectDB };