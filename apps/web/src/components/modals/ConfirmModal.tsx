import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm  p-4">
      <div 
        className="modal-panel w-full max-w-sm bg-bg-surface rounded-2xl border border-border-default overflow-hidden"
        role="dialog"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-accent-muted text-accent'}`}>
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-text-primary mb-2">
                {title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-bg-primary border-t border-border-subtle flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`primary-action px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isDanger 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20' 
                : 'bg-accent hover:bg-accent-hover text-accent-foreground'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
