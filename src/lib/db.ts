/**
 * @module lib/db
 * @description Prisma database client singleton.
 * Provides a global Prisma client instance with proper handling for development hot-reloading.
 */
import { PrismaClient } from "@prisma/client";

/**
 * Create a new Prisma client instance.
 * @returns A new PrismaClient instance
 * @internal
 */
const prismaClientSingleton = () => {
  return new PrismaClient();
};

/**
 * Global type augmentation for storing Prisma client across hot reloads.
 */
declare global {
  /** Global Prisma client instance for development hot-reload persistence */
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

/**
 * Shared Prisma database client instance.
 * In development, the client is stored globally to prevent multiple instances during hot reloading.
 * In production, a new instance is created.
 *
 * @example
 * ```typescript
 * import { prisma } from "@/lib/db";
 *
 * const users = await prisma.user.findMany();
 * ```
 */
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Store the client globally in development to survive hot reloads
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}