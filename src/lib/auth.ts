import NextAuth from "next-auth";
import type { NextAuthConfig, Session as NextAuthSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

// We'll type the parts of session we use
type SessionWithUser = NextAuthSession & {
  user: {
    id: string;
    isAdmin?: boolean;
  };
};

const authorizedEmail = process.env.AUTHORIZED_ADMIN_EMAIL;

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
      if (!authorizedEmail) {
        return false;
      }

      return user.email === authorizedEmail;
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
      if (!authorizedEmail || user.email !== authorizedEmail) {
        return;
      }

      await prisma.user.updateMany({
        where: { email: authorizedEmail },
        data: { isAdmin: true },
      });
    },
  },

  pages: {
    signIn: "/admin/login",
    error: "/admin/error",
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);
