"use client";
import { API_URL } from '@/lib/api';

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FileText, Plus, Calendar, Trash2, ExternalLink } from "lucide-react";
import CreateDocumentModal from "@/components/modals/CreateDocumentModal";
import ConfirmModal from "@/components/modals/ConfirmModal";

interface Document {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkspaceDocumentsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const { data: session, status } = useSession();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDoc, setShowCreateDoc] = useState(false);

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

  const fetchData = async () => {
    try {
      // 1. Fetch workspace details (to get the name)
      const wsRes = await fetch(`${API_URL}/api/workspaces/${workspaceId}`, {
        credentials: "include",
      });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaceName(wsData.name);
      }

      // 2. Fetch documents
      const docRes = await fetch(`${API_URL}/api/documents?workspaceId=${workspaceId}`, {
        credentials: "include",
      });
      if (docRes.ok) {
        const docData = await docRes.json();
        setDocuments(docData);
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
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, workspaceId]);

  const handleDelete = (e: React.MouseEvent, docId: string) => {
    e.preventDefault(); // Prevent navigating to document
    
    setConfirmModalState({
      isOpen: true,
      title: "Delete Document",
      message: "Are you sure you want to delete this document? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/api/documents/${docId}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (res.ok) {
            fetchData();
          } else {
            console.error("Failed to delete document");
          }
        } catch (error) {
          console.error("Error deleting document:", error);
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
        
        {/* ---- BREADCRUMBS & HEADER ---- */}
        <div className="mb-8 pb-6 border-b border-border-subtle flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Link href={`/w/${workspaceId}`} className="hover:text-text-primary transition-colors">
              {workspaceName || "Workspace"}
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Documents</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                Documents
              </h1>
              <p className="text-text-secondary mt-1 text-sm">
                Collaborative notes, plans, and specifications.
              </p>
            </div>
            <button 
              onClick={() => setShowCreateDoc(true)}
              className="primary-action inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground font-semibold transition-colors"
            >
              <Plus size={18} />
              New Document
            </button>
          </div>
        </div>

        {/* ---- DOCUMENTS GRID ---- */}
        <div>
          {documents.length === 0 ? (
            /* Empty State */
            <div className="surface-panel p-10 rounded-xl text-center border-dashed">
              <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-accent" />
              </div>
              <h3 className="font-semibold text-text-primary mb-1">No documents yet</h3>
              <p className="text-sm text-text-tertiary mb-4">Create your first collaborative document.</p>
              <button 
                onClick={() => setShowCreateDoc(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-hover text-text-primary hover:bg-border-default font-medium transition-colors"
              >
                <Plus size={16} />
                Create Document
              </button>
            </div>
          ) : (
            /* Document Cards */
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="interactive-card group flex flex-col rounded-2xl transition-all duration-300 aspect-square relative overflow-hidden"
                >
                  <button 
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="absolute top-4 right-4 text-text-tertiary hover:text-red-500 p-1.5 rounded-full hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-bg-active border border-border-default flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <FileText size={32} />
                    </div>
                    <h3 className="font-bold text-text-primary text-xl mb-1 line-clamp-2 px-2">
                      {doc.title}
                    </h3>
                  </div>

                  <div className="px-6 py-4 border-t border-border-subtle bg-bg-primary/50 rounded-b-2xl flex flex-col justify-end">
                    <div className="flex justify-center items-center text-xs font-semibold text-text-tertiary mb-4">
                      <Calendar size={14} className="mr-1.5" />
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </div>
                    <Link 
                      href={`/d/${doc.id}`}
                      className="primary-action w-full flex items-center justify-center gap-2 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-xl transition-colors"
                    >
                      Open Document <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateDocumentModal 
        isOpen={showCreateDoc} 
        onClose={() => setShowCreateDoc(false)} 
        workspaceId={workspaceId}
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
    </div>
  );
}
