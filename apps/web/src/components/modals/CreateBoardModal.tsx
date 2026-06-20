import { API_URL } from '@/lib/api';
import { useState } from "react";
import { X, Kanban } from "lucide-react";


interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

export default function CreateBoardModal({ isOpen, onClose, projectId, onSuccess }: CreateBoardModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !projectId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, projectId }),
      });

      if (res.ok) {
        await res.json();
        setName("");
        onSuccess?.();
        onClose();
      } else {
        const data = await res.json();
        console.error("Failed to create board:", data.error);
      }
    } catch (error) {
      console.error("Error creating board:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ">
      <div 
        className="modal-panel w-full max-w-md bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden"
        role="dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-bg-active rounded-lg">
              <Kanban size={18} className="text-accent" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Create Board</h2>
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
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1.5">
              Board Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 1, Marketing Campaign..."
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
              disabled={isLoading || !name}
              className="primary-action px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? "Creating..." : "Create Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
