"use client";
import { API_URL } from '@/lib/api';

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description, slug }),
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess?.();
        onClose();
        // Clear form
        setName("");
        setDescription("");
        setSlug("");
        // Navigate to the new workspace
        router.push(`/w/${data.id}`);
      } else {
        setError(data.error || "Failed to create workspace");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm  p-4">
      <div className="modal-panel w-full max-w-md bg-bg-surface rounded-2xl border border-border-default overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-text-primary">New Workspace</h2>
          <button 
            onClick={onClose}
            className="icon-action p-1 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-hover"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Auto-generate a simple slug
                  if (!slug || slug === name.slice(0, -1).toLowerCase().replace(/[^a-z0-9]/g, "-")) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }
                }}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
                placeholder="e.g., Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                URL Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
                placeholder="e.g., acme-corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent resize-none"
                placeholder="What is this workspace for?"
                rows={3}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || !slug}
              className="primary-action px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
