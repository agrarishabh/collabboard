"use client";
import { API_URL } from '@/lib/api';

import { use, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronRight, FileText, Loader2 } from "lucide-react";

const CollaborativeEditor = dynamic(() => import("@/components/CollaborativeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 border border-border-subtle rounded-2xl bg-bg-surface">
      <Loader2 className="animate-spin text-accent" size={32} />
    </div>
  ),
});

export default function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params);
  const { data: session } = useSession();
  
  const [docMetadata, setDocMetadata] = useState<{ title: string; workspaceId: string; workspace?: { name: string } } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Title editing state
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) return;

    let ignore = false;

    fetch(`${API_URL}/api/documents/${documentId}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { title: string; workspaceId: string; workspace?: { name: string } };
      })
      .then((data) => {
        if (ignore) return;
        if (data) {
          setDocMetadata(data);
          setTitle(data.title);
        }
      })
      .catch((error) => {
        console.error("Error fetching document metadata:", error);
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [session, documentId]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = async () => {
    if (!title.trim() || title === docMetadata?.title) {
      setIsEditingTitle(false);
      setTitle(docMetadata?.title || ""); // revert if empty
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = await res.json();
        if (docMetadata) {
          setDocMetadata({ ...docMetadata, title: data.title });
        }
        setIsEditingTitle(false);
      }
    } catch (error) {
      console.error("Error updating document title:", error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setTitle(docMetadata?.title || "");
      setIsEditingTitle(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!docMetadata) {
    return (
      <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center p-8 text-center">
        <FileText size={48} className="text-text-tertiary mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Document Not Found</h1>
        <p className="text-text-secondary mb-6">This document may have been deleted or you do not have access to it.</p>
        <Link 
          href="/"
          className="px-6 py-2 bg-bg-surface border border-border-default rounded-lg text-text-primary hover:border-accent transition-colors"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen bg-bg-secondary flex flex-col font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-bg-secondary border-b border-border-subtle px-6 py-4 flex items-center justify-between shadow-sm">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-text-tertiary font-medium">
          <Link href={`/w/${docMetadata.workspaceId}`} className="hover:text-text-primary transition-colors">
            {docMetadata.workspace?.name || "Workspace"}
          </Link>
          <ChevronRight size={14} />
          <Link href={`/w/${docMetadata.workspaceId}/documents`} className="hover:text-text-primary transition-colors">
            Documents
          </Link>
          <ChevronRight size={14} />
          
          {/* Inline Title Editor */}
          <div className="flex items-center">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 bg-bg-surface border border-accent rounded px-2 py-1 ml-1">
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveTitle}
                  className="bg-bg-surface text-text-primary focus:outline-none min-w-50"
                  disabled={isSavingTitle}
                />
                {isSavingTitle && <Loader2 size={12} className="animate-spin text-accent" />}
              </div>
            ) : (
              <button 
                onClick={() => setIsEditingTitle(true)}
                className="text-text-primary hover:text-accent hover:bg-accent-muted px-2 py-1 rounded transition-colors ml-1"
                title="Click to edit title"
              >
                {docMetadata.title}
              </button>
            )}
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
           <span className="text-xs text-text-tertiary flex items-center gap-1">
             <span className="live-dot w-2 h-2 rounded-full bg-accent"></span>
             Live Sync
           </span>
        </div>
      </header>

      {/* EDITOR AREA */}
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Render our collaborative editor and pass it the ID! */}
          <CollaborativeEditor documentId={documentId} />
        </div>
      </main>
    </div>
  );
}
