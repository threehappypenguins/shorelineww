/**
 * @module types/next-auth
 * @description NextAuth.js type augmentations.
 * Extends default NextAuth types to include custom user properties.
 */
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extended Session interface with custom user properties.
   */
  interface Session {
    user: {
      /** The user's unique database ID */
      id: string;
      /** Whether the user has admin privileges */
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  /**
   * Extended User interface with admin status.
   */
  interface User {
    /** Whether the user has admin privileges */
    isAdmin: boolean;
  }
}

declare module "@auth/core/adapters" {
  /**
   * Extended AdapterUser interface with admin status.
   */
  interface AdapterUser {
    /** Whether the user has admin privileges */
    isAdmin: boolean;
  }
}