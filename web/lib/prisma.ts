import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma client singleton - avoids exhausting connections in dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

// Keep the application pool small when using Supabase's transaction pooler.
// The pooler can close an individual connection; the query extension below
// retries those transient failures.
const adapter = new PrismaPg({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const retryableCodes = new Set(["P1001", "P1017", "P2024"]);
const extendedPrisma = basePrisma.$extends({
  query: {
    $allOperations: async ({ args, query }) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await query(args);
        } catch (error) {
          lastError = error;
          const code = (error as { code?: string })?.code;
          if (!retryableCodes.has(code ?? "") || attempt === 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        }
      }
      throw lastError;
    },
  },
});

export const prisma = extendedPrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;
