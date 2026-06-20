
import { SocketProvider } from "@/components/SocketProvider";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AppShell from "@/components/layout/AppShell";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CollabBoard",
  description: "A collaborative project management and document editing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        {/* Providers wraps everything in NextAuth's SessionProvider */}
        <Providers>
          {/* SocketProvider creates a single Socket.IO connection for the whole app */}
          <SocketProvider>
            {/* AppShell renders the sidebar when logged in, or just the page when not */}
            <AppShell>
              {children}
            </AppShell>
          </SocketProvider>
        </Providers>
      </body>
    </html>
  );
}