
"use client";

import { useSession } from "next-auth/react";
import AppSidebar from "./AppSidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  // While NextAuth is still checking the cookie, show nothing
  // (this prevents a flash of the login page before redirecting)
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
        <div className="flex flex-col items-center gap-3">
          {/* Simple animated spinner */}
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-tertiary">Loading...</span>
        </div>
      </div>
    );
  }

  // If the user is NOT logged in, just render the page without the sidebar.
  // This is used for the login/landing page.
  if (!session) {
    return <>{children}</>;
  }

  // If the user IS logged in, render sidebar + main content side by side
  return (
    <div className="flex min-h-screen">
      {/* Left sidebar - always visible when logged in */}
      <AppSidebar />

      {/* Main content area - takes up all remaining space */}
      <main className="app-main flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
