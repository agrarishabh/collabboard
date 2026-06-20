import { API_URL } from '@/lib/api';
import { useState } from "react";
import { X, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function CreateDocumentModal({ isOpen, onClose, workspaceId }: CreateDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !workspaceId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, workspaceId }),
      });

      if (res.ok) {
        const doc = await res.json();
        setTitle("");
        onClose();
        // Redirect directly to the new document
        router.push(`/d/${doc.id}`);
      } else {
        const data = await res.json();
        console.error("Failed to create document:", data.error);
      }
    } catch (error) {
      console.error("Error creating document:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-secondary  ">
      <div 
        className="modal-panel w-full max-w-md bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden"
        role="dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-bg-active rounded-lg">
              <FileText size={18} className="text-accent" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">New Document</h2>
          </div>
          <button 
            onClick={onClose}
            className="icon-action p-1 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1.5">
              Document Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Marketing Strategy, Project Requirements..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-tertiary"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-primary bg-bg-hover hover:bg-bg-active rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title}
              className="primary-action px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? "Creating..." : "Create Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
