"use client";
import { API_URL } from '@/lib/api';

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FolderKanban, Plus, Calendar, Edit2, Trash2, BarChart2 } from "lucide-react";
import CreateProjectModal from "@/components/modals/CreateProjectModal";
import CreateBoardModal from "@/components/modals/CreateBoardModal";
import { Kanban } from "lucide-react";
import ConfirmModal from "@/components/modals/ConfirmModal";
import UpdateModal from "@/components/modals/UpdateModal";
import ProjectAnalyticsModal from "@/components/modals/ProjectAnalyticsModal";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  boards: { id: string; name: string; createdAt: string }[];
  _count: {
    boards: number;
  };
}

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const { data: session, status } = useSession();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [userRole, setUserRole] = useState<string>("MEMBER");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [createBoardForProject, setCreateBoardForProject] = useState<string | null>(null);
  const [analyticsModal, setAnalyticsModal] = useState({ isOpen: false, projectId: "", projectName: "" });

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

  const [updateModalState, setUpdateModalState] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: string;
    placeholder?: string;
    onUpdate: (newValue: string) => void;
  }>({
    isOpen: false,
    title: "",
    initialValue: "",
    onUpdate: () => {}
  });

  const fetchWorkspaceData = async () => {
    try {
      // 1. Fetch workspace details (to get the name)
      const wsRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        credentials: "include",
      });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaceName(wsData.name);
        if (session?.user?.id && wsData.members) {
          const myMember = wsData.members.find((m: { userId: string; role: string }) => m.userId === session.user.id);
          if (myMember) setUserRole(myMember.role);
        }
      }

      // 2. Fetch projects in this workspace
      const projRes = await fetch(`${API_URL}/api/projects?workspaceId=${workspaceId}`, {
        credentials: "include",
      });
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjects(projData);
      }
    } catch (error) {
      console.error("Error fetching workspace data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWorkspaceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, workspaceId]);

  const handleUpdateProject = (projectId: string, currentName: string) => {
    setUpdateModalState({
      isOpen: true,
      title: "Rename Project",
      initialValue: currentName,
      placeholder: "Enter new project name",
      onUpdate: async (newName) => {
        try {
          const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: newName })
          });
          if (res.ok) {
            fetchWorkspaceData();
            setUpdateModalState(prev => ({ ...prev, isOpen: false }));
          } else {
            alert((await res.json()).error);
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleDeleteProject = (projectId: string) => {
    setConfirmModalState({
      isOpen: true,
      title: "Delete Project",
      message: "Are you sure you want to delete this project? All boards and tasks inside will be lost.",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
            method: "DELETE",
            credentials: "include"
          });
          if (res.ok) fetchWorkspaceData();
          else alert((await res.json()).error);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleUpdateBoard = (e: React.MouseEvent, boardId: string, currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setUpdateModalState({
      isOpen: true,
      title: "Rename Board",
      initialValue: currentName,
      placeholder: "Enter new board name",
      onUpdate: async (newName) => {
        try {
          const res = await fetch(`${API_URL}/api/boards/${boardId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: newName })
          });
          if (res.ok) {
            fetchWorkspaceData();
            setUpdateModalState(prev => ({ ...prev, isOpen: false }));
          } else {
            alert((await res.json()).error);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleDeleteBoard = (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmModalState({
      isOpen: true,
      title: "Delete Board",
      message: "Are you sure you want to delete this board? All tasks will be lost.",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/boards/${boardId}`, {
            method: "DELETE",
            credentials: "include"
          });
          if (res.ok) fetchWorkspaceData();
          else alert((await res.json()).error);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleUpdateWorkspace = () => {
    setUpdateModalState({
      isOpen: true,
      title: "Rename Workspace",
      initialValue: workspaceName,
      placeholder: "Enter new workspace name",
      onUpdate: async (newName) => {
        try {
          const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: newName })
          });
          if (res.ok) {
            setWorkspaceName(newName);
            setUpdateModalState(prev => ({ ...prev, isOpen: false }));
            // Optional: window.location.reload() or we just rely on state update
          } else {
            alert((await res.json()).error);
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const handleDeleteWorkspace = () => {
    setConfirmModalState({
      isOpen: true,
      title: "Delete Workspace",
      message: "Are you sure you want to delete this workspace? Everything inside it will be destroyed.",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
            method: "DELETE",
            credentials: "include"
          });
          if (res.ok) window.location.href = "/";
          else alert((await res.json()).error);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen bg-bg-secondary p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                {workspaceName || "Workspace"}
              </h1>
              <div className="flex items-center gap-1">
                {(userRole === "OWNER" || userRole === "ADMIN") && (
                  <button 
                    onClick={handleUpdateWorkspace}
                    className="p-1.5 text-text-tertiary hover:text-accent hover:bg-bg-hover rounded-lg transition-colors"
                    title="Rename Workspace"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                {userRole === "OWNER" && (
                  <button 
                    onClick={handleDeleteWorkspace}
                    className="p-1.5 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete Workspace"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-text-secondary mt-1">
              Manage your projects, boards, and documents.
            </p>
          </div>
          {(userRole === "OWNER" || userRole === "ADMIN") && (
            <button 
              onClick={() => setShowCreateProject(true)}
              className="primary-action inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground font-medium transition-colors"
            >
              <Plus size={18} />
              New Project
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* ---- PROJECTS GRID ---- */}
          <div className="w-full">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <FolderKanban size={20} className="text-accent" />
              Projects
            </h2>

            {projects.length === 0 ? (
              /* Empty State */
              <div className="surface-panel p-10 rounded-xl text-center border-dashed">
                <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
                  <FolderKanban size={24} className="text-accent" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">No projects yet</h3>
                <p className="text-sm text-text-tertiary mb-4">Create your first project to start organizing boards.</p>
                {(userRole === "OWNER" || userRole === "ADMIN") && (
                  <button 
                    onClick={() => setShowCreateProject(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-hover text-text-primary hover:bg-border-default font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Create Project
                  </button>
                )}
              </div>
            ) : (
              /* Project Cards */
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <div 
                    key={project.id} 
                    className="interactive-card group flex flex-col rounded-2xl transition-all duration-300 min-h-62.5 relative overflow-hidden"
                  >
                    {(userRole === "OWNER" || userRole === "ADMIN") && (
                      <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => setAnalyticsModal({ isOpen: true, projectId: project.id, projectName: project.name })}
                          className="text-text-tertiary hover:text-accent p-1.5 rounded-full hover:bg-accent-muted transition-colors bg-bg-primary "
                          title="Project Analytics"
                        >
                          <BarChart2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleUpdateProject(project.id, project.name)}
                          className="text-text-tertiary hover:text-accent p-1.5 rounded-full hover:bg-bg-hover transition-colors bg-bg-primary "
                          title="Rename Project"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-text-tertiary hover:text-red-400 p-1.5 rounded-full hover:bg-red-400/10 transition-colors bg-bg-primary "
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-center overflow-hidden relative">
                      <div className="w-16 h-16 shrink-0 rounded-2xl bg-bg-active border border-border-default flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                        <FolderKanban size={32} />
                      </div>
                      
                      <h3 className="font-bold text-text-primary text-xl mb-1 truncate w-full px-2">
                        {project.name}
                      </h3>
                      
                      {project.description ? (
                        <p className="text-sm text-text-secondary line-clamp-2 mt-2 w-full">
                          {project.description}
                        </p>
                      ) : (
                        <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1 justify-center"><Calendar size={12}/> {new Date(project.createdAt).toLocaleDateString()}</p>
                      )}
                    </div>

                    {/* Boards List & Footer */}
                    <div className="flex-1 border-t border-border-subtle bg-bg-primary/50 rounded-b-2xl flex flex-col overflow-hidden min-h-30">
                      {/* Scrollable Boards List */}
                      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {project.boards && project.boards.length > 0 ? (
                          project.boards.map(board => (
                            <div 
                              key={board.id} 
                              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-bg-active hover:bg-bg-hover text-text-primary transition-all border border-border-subtle group/board shrink-0"
                            >
                              <div className="p-1.5 rounded-md bg-bg-primary group-hover/board:bg-accent-muted transition-colors shrink-0">
                                <Kanban size={14} className="text-text-secondary group-hover/board:text-accent transition-colors" />
                              </div>
                              <span className="text-sm font-semibold truncate flex-1">{board.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <Link 
                                  href={`/b/${board.id}`}
                                  className="primary-action flex items-center gap-1 px-2.5 py-1 bg-accent text-accent-foreground font-bold text-[10px] uppercase tracking-wider rounded hover:bg-accent-hover transition-colors"
                                  title="Open Board"
                                >
                                  Open
                                </Link>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={(e) => handleUpdateBoard(e, board.id, board.name)}
                                    className="p-1 text-text-tertiary hover:text-accent hover:bg-bg-hover rounded transition-colors"
                                    title="Rename Board"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={(e) => handleDeleteBoard(e, board.id)}
                                    className="p-1 text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                    title="Delete Board"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center text-text-tertiary opacity-60">
                            <Kanban size={24} className="mb-2" />
                            <p className="text-sm font-medium">No boards yet</p>
                          </div>
                        )}
                      </div>

                      {/* Footer bar with New Board button */}
                      <div className="p-3 border-t border-border-subtle flex items-center justify-between bg-bg-surface shrink-0">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                          <FolderKanban size={14} />
                          {project._count?.boards || 0} Boards
                        </span>
                        <button 
                          onClick={() => setCreateBoardForProject(project.id)}
                          className="primary-action flex items-center gap-1 px-3 py-1.5 bg-bg-active hover:bg-accent text-text-primary hover:text-accent-foreground rounded-lg transition-colors text-xs font-bold"
                        >
                          <Plus size={14} /> New Board
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>

      {showCreateProject && (
        <CreateProjectModal 
        isOpen={showCreateProject} 
        onClose={() => setShowCreateProject(false)} 
        workspaceId={workspaceId}
        onSuccess={fetchWorkspaceData}
      />
      )}

      <CreateBoardModal 
        isOpen={!!createBoardForProject} 
        onClose={() => setCreateBoardForProject(null)} 
        projectId={createBoardForProject || ""}
        onSuccess={fetchWorkspaceData}
      />

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Delete"
        isDanger={true}
      />

      <UpdateModal
        isOpen={updateModalState.isOpen}
        onClose={() => setUpdateModalState(prev => ({ ...prev, isOpen: false }))}
        onUpdate={updateModalState.onUpdate}
        title={updateModalState.title}
        initialValue={updateModalState.initialValue}
        placeholder={updateModalState.placeholder}
      />

      {analyticsModal.isOpen && (
        <ProjectAnalyticsModal
          projectId={analyticsModal.projectId}
          projectName={analyticsModal.projectName}
          onClose={() => setAnalyticsModal({ isOpen: false, projectId: "", projectName: "" })}
        />
      )}
    </div>
  );
}
