import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.NODE_ENV === "production";
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const hostPrefix = useSecureCookies ? "__Host-" : "";

export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `${hostPrefix}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },
  // 1. Connect NextAuth to our Neon Database via Prisma
  // This automatically saves users when they log in for the first time
  adapter: PrismaAdapter(prisma) as Adapter,

  // 2. Define the login methods (Providers)
  providers: [
    GoogleProvider({
      // We use dummy strings for now if they aren't in the .env yet
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy_secret",
    }),
  ],

  // 3. Security Strategy
  session: {
    // We use JWT instead of database sessions because it's much faster
    // and makes it very easy to authenticate with our Express backend
    strategy: "jwt",
  },

  // 4. Callbacks: Functions that run during the auth lifecycle
    callbacks: {
    // This runs every time a user session is checked
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
