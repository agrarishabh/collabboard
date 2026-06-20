import { useState, useEffect } from "react";
import { Edit2, X } from "lucide-react";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (newValue: string) => void;
  title: string;
  initialValue: string;
  placeholder?: string;
  isUpdating?: boolean;
}

export default function UpdateModal({
  isOpen,
  onClose,
  onUpdate,
  title,
  initialValue,
  placeholder = "Enter new name...",
  isUpdating = false,
}: UpdateModalProps) {
  const [value, setValue] = useState(initialValue);

  // Update internal state when modal opens with new initial value
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && value !== initialValue) {
      onUpdate(value.trim());
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-100 flex items-center justify-center bg-bg-secondary   p-4">
      <div 
        className="modal-panel w-full max-w-md bg-bg-surface rounded-2xl border border-border-default overflow-hidden"
        role="dialog"
      >
        <div className="flex justify-between items-center p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent-muted rounded-lg text-accent">
              <Edit2 size={18} />
            </div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="icon-action p-1 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-bg-hover"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder={placeholder}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating || !value.trim() || value === initialValue}
              className="primary-action px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
