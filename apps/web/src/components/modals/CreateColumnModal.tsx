import { API_URL } from '@/lib/api';
import { useState } from "react";
import { X, Columns } from "lucide-react";

interface CreateColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

export default function CreateColumnModal({ isOpen, onClose, boardId }: CreateColumnModalProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !boardId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, boardId }),
      });

      if (res.ok) {
        setName("");
        onClose();
        window.location.reload(); 
      } else {
        const data = await res.json();
        console.error("Failed to create column:", data.error);
      }
    } catch (error) {
      console.error("Error creating column:", error);
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
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-bg-active rounded-lg border border-border-default">
              <Columns size={18} className="text-accent" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">New Column</h2>
          </div>
          <button 
            onClick={onClose}
            className="icon-action p-1 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1.5">
              Column Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Backlog, Review, Done..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-tertiary"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
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
              {isLoading ? "Creating..." : "Create Column"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
