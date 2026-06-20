import { API_URL } from '@/lib/api';
import { useState, useEffect, useCallback } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import ConfirmModal from "./ConfirmModal";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    image?: string;
  };
}

interface Task {
  title: string;
  description?: string;
  priority: string;
  dueDate?: string | null;
  labels?: string[];
  assigneeId?: string | null;
  assignee?: { id: string; name: string; image?: string | null };
  column?: { 
    name: string;
    board?: { project?: { workspaceId: string } }
  };
  creator?: { name?: string };
  comments?: Comment[];
  attachments?: { id: string; url: string; name: string }[];
}

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

export default function TaskDetailModal({ isOpen, onClose, taskId }: TaskDetailModalProps) {
  const { data: session } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<{user: {id: string; name: string}}[]>([]);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');

  const loadTask = useCallback(async (): Promise<Task | null> => {
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        credentials: "include",
      });
      if (res.ok) {
        return (await res.json()) as Task;
      }
    } catch (error) {
      console.error("Failed to fetch task details", error);
    }
    return null;
  }, [taskId]);

  useEffect(() => {
    if (!isOpen || !taskId) return;

    let ignore = false;

    Promise.resolve()
      .then(() => {
        if (!ignore) {
          setIsLoading(true);
        }
        return loadTask();
      })
      .then((data) => {
        if (ignore) return;
        if (data) {
          setTask(data);
          setTitle(data.title);
          setDescription(data.description || "");
          setPriority(data.priority);
          setDueDate(data.dueDate ? data.dueDate.split('T')[0] : "");
          setLabels(data.labels ? data.labels.join(", ") : "");
          setAssigneeId(data.assignee?.id || "");
          
          const workspaceId = data.column?.board?.project?.workspaceId;
          if (workspaceId) {
            fetch(`${API_URL}/api/workspaces/${workspaceId}/members`, { credentials: "include" })
              .then(r => r.json())
              .then(m => { if (!m.error) setMembers(m); });
          }
        } else {
          setTask(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, taskId, loadTask]);


  if (!isOpen) return null;

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          title, 
          description, 
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          labels: labels ? labels.split(",").map(l => l.trim()).filter(Boolean) : [],
          assigneeId: assigneeId || null
        }),
      });
      if (res.ok) {
        // Ideally we'd use a more reactive state management to update the parent board
        // For now, reloading or re-fetching board works.
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update task", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session?.user?.id) return;
    
    setIsPostingComment(true);
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newComment, taskId, authorId: session.user.id }),
      });
      if (res.ok) {
        setNewComment("");
        const data = await loadTask();
        if (data) {
          setTask(data);
          setTitle(data.title);
          setDescription(data.description || "");
          setPriority(data.priority);
          setDueDate(data.dueDate ? data.dueDate.split('T')[0] : "");
          setLabels(data.labels ? data.labels.join(", ") : "");
          setAssigneeId(data.assignee?.id || "");
        }
      }
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteTask = async () => {
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ">
      <div 
        className="modal-panel w-full max-w-3xl max-h-[90vh] flex flex-col bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary shrink-0">
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="text-xs uppercase tracking-wider font-bold">In list:</span>
            <span className="text-sm px-2 py-1 bg-bg-active rounded-md border border-border-default">
              {task?.column?.name || "..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowConfirmDelete(true)}
              className="icon-action p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={onClose}
              className="icon-action p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center min-h-75">
              <Loader2 className="animate-spin text-accent" size={32} />
            </div>
          ) : !task ? (
            <div className="flex-1 flex items-center justify-center min-h-75 text-text-tertiary">
              Task not found.
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full w-full">
              {/* Custom Tabs Navigation */}
              <div className="flex border-b border-border-subtle mt-6 mb-4">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${
                    activeTab === 'details' ? 'border-accent text-accent' : 'border-transparent text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${
                    activeTab === 'comments' ? 'border-accent text-accent' : 'border-transparent text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  Comments
                  <span className="bg-bg-hover text-text-secondary px-1.5 py-0.5 rounded text-xs">
                    {task.comments?.length || 0}
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto w-full">
                {activeTab === 'details' && (
                  <div className="flex flex-col md:flex-row gap-8 w-full">
                    {/* Left Column: Details */}
                    <div className="flex-1 flex flex-col gap-6">
                      <div>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 py-2 text-2xl font-bold bg-bg-active border border-border-default rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none placeholder:text-text-tertiary transition-colors"
                          placeholder="Task title..."
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Description</h3>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Add a more detailed description..."
                          className="w-full p-3 bg-bg-primary border border-border-default rounded-xl text-text-primary focus:outline-none focus:border-accent transition-colors min-h-30 resize-y"
                        />
                      </div>

                      <div>
                        <button
                          onClick={handleUpdate}
                          disabled={isSaving || !title}
                          className="primary-action px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                      
                      {labels && labels.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Labels</h3>
                          <div className="flex flex-wrap gap-2">
                            {labels.split(",").map(l => l.trim()).filter(Boolean).map(label => (
                              <span key={label} className="px-2 py-1 text-xs bg-bg-active border border-border-default rounded-md text-text-primary">
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Sidebar Actions */}
                    <div className="w-full md:w-56 shrink-0 flex flex-col gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Priority</h4>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full p-2 text-sm bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Due Date</h4>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full p-2 text-sm bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Assignee</h4>
                        <select
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          className="w-full p-2 text-sm bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                        >
                          <option value="">Unassigned</option>
                          {members.map(m => (
                            <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Edit Labels</h4>
                        <input
                          type="text"
                          value={labels}
                          onChange={(e) => setLabels(e.target.value)}
                          placeholder="comma separated..."
                          className="w-full p-2 text-sm bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                      </div>

                      <div className="mt-4 pt-4 border-t border-border-subtle">
                        <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Created By</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bg-active flex items-center justify-center text-accent text-[10px] font-bold">
                            {task.creator?.name?.charAt(0) || "?"}
                          </div>
                          <span className="text-sm text-text-secondary">{task.creator?.name || "Unknown"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'comments' && (
                  <div className="w-full max-w-2xl">
                    {/* Comment Input */}
                    <form onSubmit={handlePostComment} className="flex gap-3 mb-8 bg-bg-primary p-4 rounded-xl border border-border-default">
                      <div className="w-8 h-8 rounded-full bg-accent shrink-0 flex items-center justify-center text-accent-foreground text-xs font-bold mt-1">
                        {session?.user?.name?.charAt(0) || "U"}
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full p-3 bg-bg-surface border border-border-default rounded-xl text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none resize-y text-sm transition-colors"
                          rows={2}
                        />
                        <div className="flex justify-end pt-2 border-t border-border-subtle">
                          <button
                            type="submit"
                            disabled={!newComment.trim() || isPostingComment}
                            className="primary-action px-4 py-1.5 text-sm font-semibold bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                          >
                            {isPostingComment ? "Posting..." : "Post Comment"}
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Comments List */}
                    <div className="flex flex-col gap-6">
                      {(task.comments?.length ?? 0) === 0 && (
                        <p className="text-text-tertiary text-center py-8">No comments yet. Be the first to start the discussion!</p>
                      )}
                      {task.comments?.map((comment: Comment) => (
                        <div key={comment.id} className="flex gap-4">
                          {comment.author.image ? (
                            <Image src={comment.author.image} alt={comment.author.name} width={40} height={40} className="rounded-full object-cover shrink-0 border border-border-subtle" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-bg-active shrink-0 flex items-center justify-center text-accent border border-border-subtle text-sm font-bold">
                              {comment.author.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-sm text-text-primary">{comment.author.name}</span>
                              <span className="text-xs text-text-tertiary">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-1 max-w-full">
                              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
