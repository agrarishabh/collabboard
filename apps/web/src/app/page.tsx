"use client";
import { API_URL } from '@/lib/api';
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Kanban, FileText, Activity, MessageCircle } from "lucide-react";

// ---- TypeScript interface for workspace data from our API ----
interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  _count?: {
    members: number;
    projects: number;
  };
}

export default function Home() {
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // ---- Fetch workspaces from our Express API ----
  useEffect(() => {
    if (session) {
      fetch(`${API_URL}/api/workspaces`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) setWorkspaces(data);
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkspaces([]);
    }
  }, [session]);

  // ---- LANDING PAGE (shown when user is NOT logged in) ----
  if (!session && status !== "loading") {
    return (
      <main className="page-shell min-h-screen flex flex-col bg-bg-secondary">
        {/* Header/Nav */}
        <header className="px-8 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground font-extrabold text-lg shadow-lg shadow-cyan-900/20">
              C
            </div>
            <span className="text-xl font-extrabold text-text-primary tracking-tight">
              CollabBoard
            </span>
          </div>
          <button
            onClick={() => signIn("google")}
            className="surface-panel px-5 py-2.5 rounded-lg hover:bg-bg-hover text-text-primary font-semibold text-sm transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Sparkle badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-muted text-accent text-sm font-semibold mb-8 border border-accent/20 shadow-inner">
              <Sparkles size={14} />
              The ultimate collaboration hub
            </div>

            <h1 className="text-6xl md:text-7xl font-black text-text-primary tracking-tighter mb-6 leading-tight">
              Where teams <br/>
              <span className="text-transparent bg-clip-text bg-linear-to-r from-accent to-white">
                build the future.
              </span>
            </h1>

            <p className="text-xl text-text-secondary mb-10 leading-relaxed max-w-2xl mx-auto">
              Bring your team together with dynamic Kanban boards, live document editing, comprehensive activity feeds, and real-time chat — all in one unified workspace.
            </p>

            {/* Sign In Button */}
            <button
              onClick={() => signIn("google")}
              className="primary-action inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-bold text-lg transition-all"
            >
              Get Started for Free
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-7xl mx-auto w-full px-8">
            {[
              { icon: Kanban, title: "Kanban Boards", desc: "Drag-and-drop task management with real-time sync and nested comments." },
              { icon: Activity, title: "Activity Feed", desc: "Stay updated with a complete log of everything happening in your workspace." },
              { icon: MessageCircle, title: "Real-time Chat", desc: "Communicate instantly with your team using the built-in chat drawer." },
              { icon: FileText, title: "Live Documents", desc: "Collaborative rich-text editing with cursors and presence." },
            ].map((feature) => (
              <div key={feature.title} className="interactive-card p-6 rounded-2xl transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-bg-active flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className="text-accent" />
                </div>
                <h3 className="font-bold text-text-primary text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-text-tertiary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border-subtle bg-bg-primary py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-accent-foreground font-bold text-[10px]">C</div>
              <span className="font-bold text-text-primary">CollabBoard</span>
            </div>
            <p className="text-sm text-text-tertiary">
              © {new Date().getFullYear()} CollabBoard. Built for seamless teamwork.
            </p>
          </div>
        </footer>
      </main>
    );
  }

  // ---- DASHBOARD (shown when user IS logged in) ----
  return (
    <div className="page-shell min-h-screen bg-bg-secondary p-8">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Welcome back, {session?.user?.name?.split(" ")[0]} 
          </h1>
          <p className="text-text-secondary mt-1">
            Here&apos;s what&apos;s happening in your workspaces.
          </p>
        </div>

        {/* Workspaces Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Your Workspaces
            </h2>
          </div>

          {workspaces.length === 0 ? (
            /* ---- Empty State ---- */
            <div className="surface-panel p-8 rounded-xl text-center">
              <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
                <Kanban size={24} className="text-accent" />
              </div>
              <h3 className="font-semibold text-text-primary mb-1">No workspaces yet</h3>
              <p className="text-sm text-text-tertiary">Create your first workspace to get started!</p>
            </div>
          ) : (
            /* ---- Workspace Cards Grid ---- */
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="interactive-card group flex flex-col rounded-2xl transition-all duration-300 aspect-square"
                >
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                    {/* Workspace Logo Centered */}
                    <div className="w-16 h-16 rounded-2xl bg-bg-active border border-border-default flex items-center justify-center text-accent font-extrabold text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <h3 className="font-bold text-text-primary text-xl mb-1">
                      {workspace.name}
                    </h3>
                    
                    {workspace.description ? (
                      <p className="text-sm text-text-secondary line-clamp-2 mt-2">
                        {workspace.description}
                      </p>
                    ) : (
                      <p className="text-xs text-text-tertiary mt-1">/{workspace.slug}</p>
                    )}
                  </div>

                  <div className="px-6 py-4 border-t border-border-subtle bg-bg-primary/50 rounded-b-2xl">
                    <div className="flex justify-between items-center text-xs font-semibold text-text-secondary mb-4 px-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg text-text-primary">{workspace._count?.projects || 0}</span>
                        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Projects</span>
                      </div>
                      <div className="w-px h-8 bg-border-subtle" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg text-text-primary">{workspace._count?.members || 1}</span>
                        <span className="text-[10px] uppercase tracking-wider text-text-tertiary">Members</span>
                      </div>
                    </div>

                    <Link
                      href={`/w/${workspace.id}`}
                      className="primary-action w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-xl transition-colors"
                    >
                      Open Workspace
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
