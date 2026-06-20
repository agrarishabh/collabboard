"use client";
import { API_URL } from '@/lib/api';

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Users, Mail, Trash2, Shield, User, Plus, Loader2 } from "lucide-react";
import ConfirmModal from "@/components/modals/ConfirmModal";

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export default function WorkspaceMembersPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const { data: session, status } = useSession();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Current user's membership in this workspace
  const currentUserRole = members.find(m => m.user.id === session?.user?.id)?.role;
  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const fetchData = async () => {
    try {
      // 1. Fetch workspace details
      const wsRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        credentials: "include",
      });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaceName(wsData.name);
      }

      // 2. Fetch members
      const memRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, {
        credentials: "include",
      });
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(memData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, workspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteError("");
    setInviteSuccess(false);

    try {
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteSuccess(true);
        setInviteEmail("");
        // Optimistically add to list or refetch
        fetchData();
        setTimeout(() => setInviteSuccess(false), 3000);
      } else {
        setInviteError(data.error || "Failed to invite member");
      }
    } catch {
      setInviteError("An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = (userId: string, userName: string) => {
    setConfirmModalState({
      isOpen: true,
      title: "Remove Member",
      message: `Are you sure you want to remove ${userName} from this workspace?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/members/${userId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (res.ok) {
            setMembers(members.filter(m => m.user.id !== userId));
            setConfirmModalState(prev => ({ ...prev, isOpen: false }));
          } else {
            const data = await res.json();
            alert(data.error || "Failed to remove member");
          }
        } catch (error) {
          console.error("Error removing member:", error);
        }
      }
    });
  };


  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen bg-bg-secondary p-8 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="pb-6 border-b border-border-subtle flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Link href={`/w/${workspaceId}`} className="hover:text-text-primary transition-colors">
              {workspaceName || "Workspace"}
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Members</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Manage Members
            </h1>
            <p className="text-text-secondary mt-1 text-sm">
              Invite people to collaborate on your boards and documents.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Users size={18} className="text-accent" />
              Team Members ({members.length})
            </h2>

            <div className="surface-panel rounded-xl overflow-hidden">
              {members.map((member) => {
                const isMe = member.user.id === session?.user?.id;
                const canRemove = canManageMembers && !isMe && !(currentUserRole === "ADMIN" && member.role === "OWNER");

                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border-b border-border-subtle last:border-0 hover:bg-bg-hover transition-colors">
                    <div className="flex items-center gap-3">
                      {member.user.image ? (
                        <Image src={member.user.image} alt={member.user.name} width={40} height={40} className="w-10 h-10 rounded-full bg-border-default" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent-muted text-accent flex items-center justify-center font-bold text-sm">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-primary text-sm">
                            {member.user.name}
                            {isMe && <span className="ml-2 text-xs bg-bg-active px-1.5 py-0.5 rounded text-text-tertiary">You</span>}
                          </p>
                        </div>
                        <p className="text-xs text-text-tertiary">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Role Badge */}
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-bg-active text-text-secondary border border-border-default">
                        {member.role === "OWNER" && <Shield size={12} className="text-accent" />}
                        {member.role === "ADMIN" && <Shield size={12} />}
                        {member.role === "MEMBER" && <User size={12} />}
                        {member.role}
                      </span>

                      {/* Remove Button */}
                      {canRemove && (
                        <button 
                          onClick={() => handleRemove(member.user.id, member.user.name)}
                          className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="Remove from workspace"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar / Invite Card */}
          <div className="md:col-span-1">
            <div className="surface-panel rounded-xl p-5 sticky top-8">
              <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                <Mail size={16} className="text-accent" />
                Invite Members
              </h3>
              
              {canManageMembers ? (
                <form onSubmit={handleInvite} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all mb-3"
                      required
                    />

                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Assign Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer"
                    >
                      <option value="MEMBER">Member (Can edit tasks and boards)</option>
                      <option value="ADMIN">Admin (Can manage projects and members)</option>
                    </select>
                  </div>
                  
                  {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
                  {inviteSuccess && <p className="text-xs text-accent">User invited successfully!</p>}

                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail}
                    className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2 bg-text-primary text-accent-foreground font-semibold rounded-lg hover:bg-text-secondary transition-colors disabled:opacity-50 text-sm"
                  >
                    {isInviting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {isInviting ? "Inviting..." : "Send Invite"}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-bg-active rounded-lg text-sm text-text-secondary border border-border-default">
                  Only Owners and Admins can invite new members to this workspace.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Remove"
        isDanger={true}
      />
    </div>
  );
}
