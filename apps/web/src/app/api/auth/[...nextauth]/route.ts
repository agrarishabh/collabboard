import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Create the NextAuth handler using our configuration
const handler = NextAuth(authOptions);

// Next.js App Router requires exporting the handler for specific HTTP methods
export { handler as GET, handler as POST };