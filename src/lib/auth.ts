/**
 * @module lib/auth
 * @description NextAuth.js configuration and exports.
 * Configures Google OAuth with Prisma adapter and admin-only access control.
 */
import NextAuth from "next-auth";
import type { NextAuthConfig, Session as NextAuthSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

/**
 * Extended session type with user ID and admin status.
 * @internal
 */
type SessionWithUser = NextAuthSession & {
  user: {
    /** The user's unique database ID */
    id: string;
    /** Whether the user has admin privileges */
    isAdmin?: boolean;
  };
};

/**
 * Get the set of authorized admin emails from environment variable.
 * Only these emails can sign in. Supports comma-separated values.
 *
 * @returns Set of authorized email addresses (lowercase-insensitive)
 * @internal
 *
 * @example
 * Environment: `AUTHORIZED_ADMIN_EMAIL=one@example.com,two@example.com`
 */
function getAuthorizedAdminEmails(): Set<string> {
  const raw = process.env.AUTHORIZED_ADMIN_EMAIL?.trim() ?? "";
  if (!raw) return new Set<string>();
  const emails = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return new Set(emails);
}

/** Cached set of authorized admin emails loaded at startup */
const authorizedAdminEmails = getAuthorizedAdminEmails();

/**
 * NextAuth configuration object.
 * Configures:
 * - Prisma adapter for database persistence
 * - Google OAuth provider
 * - Admin-only sign-in restriction
 * - Custom sign-in and error pages
 * @internal
 */
const config = {
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      if (authorizedAdminEmails.size === 0) {
        return false;
      }
      return user.email != null && authorizedAdminEmails.has(user.email);
    },

    async session({ session, user }) {
      const typedSession = session as SessionWithUser;

      if (typedSession.user) {
        typedSession.user.id = user.id;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        });

        typedSession.user.isAdmin = dbUser?.isAdmin ?? false;
      }

      return typedSession;
    },
  },

  events: {
    async signIn({ user }) {
      if (!user.email || !authorizedAdminEmails.has(user.email)) {
        return;
      }

      await prisma.user.updateMany({
        where: { email: user.email },
        data: { isAdmin: true },
      });
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/error",
  },
} satisfies NextAuthConfig;

/**
 * NextAuth.js exports for use throughout the application.
 * - `handlers`: Route handlers for `/api/auth/*` endpoints
 * - `signIn`: Function to initiate sign-in
 * - `signOut`: Function to sign out
 * - `auth`: Function to get current session
 */
export const { handlers, signIn, signOut, auth } = NextAuth(config);
