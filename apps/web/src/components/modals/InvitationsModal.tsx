import { API_URL } from '@/lib/api';
import { useState, useEffect } from "react";
import { X, Check, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface InvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Invitation {
  id: string;
  name: string;
}

export default function InvitationsModal({ isOpen, onClose }: InvitationsModalProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  const fetchInvitations = () => {
    fetch(`${API_URL}/api/workspaces/invitations`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setInvitations(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && session) {
      fetchInvitations();
    }
  }, [isOpen, session]);

  const handleAccept = async (workspaceId: string) => {
    await fetch(`${API_URL}/api/workspaces/${workspaceId}/members/accept`, {
      method: "PUT",
      credentials: "include",
    });
    fetchInvitations();
    // In a real app, we'd trigger a re-fetch of workspaces here or refresh the page
    window.location.reload(); 
  };

  const handleReject = async (workspaceId: string) => {
    await fetch(`${API_URL}/api/workspaces/${workspaceId}/members/reject`, {
      method: "PUT",
      credentials: "include",
    });
    fetchInvitations();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm  flex items-center justify-center z-50 p-4">
      <div className="modal-panel bg-bg-surface border border-border-subtle rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-bg-primary">
          <h2 className="text-xl font-bold text-text-primary">Pending Invitations</h2>
          <button
            onClick={onClose}
            className="icon-action text-text-tertiary hover:text-white p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-text-secondary text-center py-4">Loading...</p>
          ) : invitations.length === 0 ? (
            <p className="text-text-tertiary text-center py-8">No pending invitations.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {invitations.map((workspace) => (
                <div key={workspace.id} className="p-4 bg-bg-active rounded-xl border border-border-subtle flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">{workspace.name}</h3>
                    <p className="text-xs text-text-tertiary">Invited as Member</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(workspace.id)}
                    className="primary-action p-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg transition-colors"
                      title="Accept"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => handleReject(workspace.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                      title="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
