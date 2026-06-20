import { API_URL } from '@/lib/api';
import { useState } from "react";
import { X, CheckSquare } from "lucide-react";
import { useSession } from "next-auth/react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnId: string;
  boardId: string; // Used to trigger a re-fetch or socket event if needed
}

export default function CreateTaskModal({ isOpen, onClose, columnId }: CreateTaskModalProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !columnId || !session?.user?.id) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          priority,
          columnId,
          creatorId: session.user.id,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          labels: labels ? labels.split(",").map(l => l.trim()).filter(Boolean) : [],
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setPriority("MEDIUM");
        setDueDate("");
        setLabels("");
        onClose();
        // The frontend will need to refetch the board data to show the new task.
        // We can do this by reloading the page, or better, we could pass an onSuccess callback.
        // For simplicity, we can reload, but let's see if we can trigger a refetch in the parent.
        window.location.reload(); 
      } else {
        const data = await res.json();
        console.error("Failed to create task:", data.error);
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ">
      <div 
        className="modal-panel w-full max-w-lg bg-bg-surface rounded-2xl border border-border-subtle overflow-hidden"
        role="dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-bg-active rounded-lg border border-border-default">
              <CheckSquare size={18} className="text-accent" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">New Task</h2>
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
            <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1.5">
              Task Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-tertiary"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1.5">
              Description <span className="text-text-tertiary font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-tertiary min-h-25 resize-y"
            />
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-text-secondary mb-1.5">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-text-secondary mb-1.5">
                Due Date
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all color-scheme-dark"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div>
              <label htmlFor="labels" className="block text-sm font-medium text-text-secondary mb-1.5">
                Labels <span className="text-text-tertiary font-normal">(comma separated)</span>
              </label>
              <input
                id="labels"
                type="text"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="e.g. bug, frontend"
                className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder:text-text-tertiary"
              />
            </div>
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
              disabled={isLoading || !title}
              className="primary-action px-4 py-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
