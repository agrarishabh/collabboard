"use client";
import { API_URL } from '@/lib/api';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Users,
  LogOut,
  ChevronDown,
  Plus,
  MessageCircle,
  Bell,
  Activity
} from "lucide-react";
import CreateWorkspaceModal from "../modals/CreateWorkspaceModal";
import ChatDrawer from "../chat/ChatDrawer";
import ActivityDrawer from "../ActivityDrawer";
import InvitationsModal from "../modals/InvitationsModal";
import ConfirmModal from "../modals/ConfirmModal";

// ---- TypeScript Interface ----
// This defines the "shape" of a workspace object from our API.
// TypeScript uses this to catch errors if we try to access a
// property that doesn't exist (e.g., workspace.foo would be an error).
interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function AppSidebar() {
  // ---- Hooks ----
  // useSession() → gives us the logged-in user's data (name, email, image)
  const { data: session } = useSession();
  // usePathname() → gives us the current URL, e.g., "/b/abc123"
  const pathname = usePathname();

  // ---- State ----
  // workspaces → array of workspace objects fetched from our API
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  // activeWorkspace → the currently selected workspace (first one by default)
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  // showCreateModal → controls whether the Create Workspace modal is open
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // ---- Fetch Workspaces ----when user logs in ----
  // useEffect runs this code when `session` changes.
  // When the user logs in, session goes from null → {user: {...}},
  // which triggers this fetch to load their workspaces.
  useEffect(() => {
    if (session) {
      fetch(`${API_URL}/api/workspaces`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && Array.isArray(data)) {
            setWorkspaces(data);
            // Auto-select the first workspace if we don't have one selected
            if (!activeWorkspace && data.length > 0) {
              setActiveWorkspace(data[0]);
            }
          }
        });

      // Fetch pending invitations count
      fetch(`${API_URL}/api/workspaces/invitations`, { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && Array.isArray(data)) {
            setPendingInvitationsCount(data.length);
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, showInvitationsModal]);

  // ---- Navigation Items ----
  // Each item in this array becomes a clickable link in the sidebar.
  // We use the activeWorkspace ID in the URL so each workspace has its own pages.
  const workspaceId = activeWorkspace?.id;
  const navItems = [
    {
      label: "Workspaces",
      href: "/",                                    // Home page
      icon: LayoutDashboard,                        // The icon component
      active: pathname === "/",                     // Is this the current page?
    },
    {
      label: "Projects",
      href: `/w/${workspaceId}`,                    // Workspace dashboard (lists boards)
      icon: Kanban,
      active: pathname === `/w/${workspaceId}` || pathname.startsWith("/b/"),
    },
    {
      label: "Documents",
      href: `/w/${workspaceId}/documents`,          // Documents list page
      icon: FileText,
      active: pathname.startsWith("/d/") || pathname.includes("/documents"),
    },
    {
      label: "Members",
      href: `/w/${workspaceId}/members`,            // Members management page
      icon: Users,
      active: pathname.includes("/members"),
    },
    {
      label: "Team Chat",
      href: "#",
      icon: MessageCircle,
      active: showChatDrawer,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setShowActivityDrawer(false); // Close other drawer
        setShowChatDrawer(true);
      }
    },
    {
      label: "Activity Feed",
      href: "#",
      icon: Activity,
      active: showActivityDrawer,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setShowChatDrawer(false); // Close other drawer
        setShowActivityDrawer(true);
      }
    }
  ];

  // ---- Don't render the sidebar if user is NOT logged in ----
  if (!session) return null;

  return (
    <aside className="sidebar">
      {/* ---- TOP: Logo ---- */}
      <div className="px-5 py-5 border-b border-border-subtle">
        <Link href="/" className="flex items-center gap-2.5">
          {/* Gradient circle as a simple logo */}
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm shadow-sm shadow-accent/10">
            C
          </div>
          <span className="text-lg font-bold text-text-primary tracking-tight">
            CollabBoard
          </span>
        </Link>
      </div>

      {/* ---- WORKSPACE SELECTOR ---- */}
      {/* This dropdown lets the user switch between their workspaces */}
      <div className="px-3 py-3 border-b border-border-subtle">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="surface-panel w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-bg-hover transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Colored circle with the first letter of workspace name */}
            <div className="w-7 h-7 rounded-md bg-mixed border border-border-default flex items-center justify-center text-accent text-xs font-bold shrink-0">
              {activeWorkspace?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <span className="text-sm font-medium text-text-primary truncate">
              {activeWorkspace?.name || "Select Workspace"}
            </span>
          </div>
          {/* Down arrow icon that rotates when dropdown is open */}
          <ChevronDown
            size={16}
            className={`text-text-tertiary transition-transform ${showDropdown ? "rotate-180" : ""}`}
          />
        </button>

        {/* ---- Dropdown Menu (shown when showDropdown is true) ---- */}
        {showDropdown && (
          <div className="surface-panel page-shell mt-2 rounded-lg overflow-hidden">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setActiveWorkspace(ws);   // Switch to this workspace
                  setShowDropdown(false);   // Close the dropdown
                }}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors
                  ${ws.id === activeWorkspace?.id
                    ? "bg-mixed-active-bg text-mixed-text"   // Highlighted if selected
                    : "text-text-secondary hover:bg-bg-hover" // Normal state
                  }`}
              >
                <div className="w-6 h-6 rounded-md bg-mixed border border-border-default flex items-center justify-center text-accent text-[10px] font-bold">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                {ws.name}
              </button>
            ))}
            {/* ---- Create New Workspace button ---- */}
            <button 
              onClick={() => {
                setShowDropdown(false);
                setShowCreateModal(true);
              }}
              className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary border-t border-border-subtle transition-colors"
            >
              <Plus size={16} />
              New Workspace
            </button>
          </div>
        )}
      </div>

      {/* ---- NAVIGATION LINKS ---- */}
      {/* Each item in navItems[] becomes a clickable link */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`sidebar-nav-item w-full text-left ${item.active ? "active" : ""}`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          }
          return (
            <Link
              key={item.label}
              href={workspaceId ? item.href : "#"}
              className={`sidebar-nav-item ${item.active ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ---- BOTTOM: User Profile + Sign Out ---- */}
      <div className="px-3 py-4 border-t border-border-subtle">
        <div className="flex items-center gap-3 px-3 py-2">
          {/* User avatar - show their Google profile image or a fallback */}
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt="Avatar"
              width={32}
              height={32}
              className="w-8 h-8 rounded-full ring-2 ring-border-subtle"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold">
              {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {session.user?.name}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {session.user?.email}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Invitations Button */}
            <button
              onClick={() => setShowInvitationsModal(true)}
              className="icon-action relative p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
              title="Invitations"
            >
              <Bell size={16} />
              {pendingInvitationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg-primary"></span>
              )}
            </button>
            {/* Sign Out button */}
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="icon-action p-2 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Render the modal outside the main layout flow */}
      <CreateWorkspaceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onSuccess={() => {
          // Refresh workspaces when a new one is created
          fetch(`${API_URL}/api/workspaces`, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
              if (!data.error && Array.isArray(data)) {
                setWorkspaces(data);
              }
            });
        }}
      />

      <ChatDrawer 
        isOpen={showChatDrawer} 
        onClose={() => setShowChatDrawer(false)}
        workspaceId={workspaceId!}
      />
      
      <ActivityDrawer
        isOpen={showActivityDrawer}
        onClose={() => setShowActivityDrawer(false)}
        workspaceId={workspaceId}
      />

      <InvitationsModal 
        isOpen={showInvitationsModal}
        onClose={() => setShowInvitationsModal(false)}
      />

      <ConfirmModal
        isOpen={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={() => signOut({ callbackUrl: '/' })}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        isDanger={true}
      />
    </aside>
  );
}
