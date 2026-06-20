import { X } from "lucide-react";
import ActivityFeed from "./ActivityFeed";

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string | undefined;
}

export default function ActivityDrawer({ isOpen, onClose, workspaceId }: ActivityDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <button 
          className="modal-backdrop fixed inset-0 bg-bg-secondary z-90 transition-opacity w-full h-full cursor-default border-none"
          onClick={onClose}
          aria-label="Close Activity Feed"
          tabIndex={-1}
        />
      )}

      {/* Drawer */}
      <div 
        className={`drawer-panel fixed inset-y-0 right-0 w-96 bg-bg-secondary border-l border-border-subtle transform transition-transform duration-300 ease-out z-100 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal={true}
        aria-label="Activity Feed"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary">
          <div className="flex items-center gap-2 text-text-primary">
            <h2 className="font-bold">Activity Feed</h2>
          </div>
          <button 
            onClick={onClose}
            className="icon-action p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (reusing the ActivityFeed component) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {workspaceId ? (
            <div className="h-full">
              <ActivityFeed workspaceId={workspaceId} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 h-full">
              <p className="text-text-primary font-semibold mb-1">No Workspace Selected</p>
              <p className="text-text-secondary text-sm">Open a workspace to see its activity feed!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
