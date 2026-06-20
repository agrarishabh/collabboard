"use client";

import { API_URL } from '@/lib/api';
import { useState, useRef, useEffect } from "react";
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import CreateTaskModal from "../modals/CreateTaskModal";
import ConfirmModal from "../modals/ConfirmModal";

interface ColumnProps {
  column: { id: string; title: string };
  tasks: { id: string; content: string; priority: string; _count?: { comments: number }; assignee?: { name: string; image: string | null } }[];
  boardId: string;
}

export default function BoardColumn({ column, tasks, boardId }: ColumnProps) {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleUpdate = async () => {
    if (!name.trim() || name === column.title) {
      setIsEditing(false);
      setName(column.title);
      return;
    }
    
    try {
      await fetch(`${API_URL}/api/columns/${column.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to update column:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${API_URL}/api/columns/${column.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete column:", error);
    }
  };

  return (
    <div className="surface-panel flex flex-col rounded-2xl w-80 min-w-80 max-h-full overflow-hidden">
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-border-subtle bg-bg-primary/70 group">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1 mr-2">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdate();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setName(column.title);
                }
              }}
              className="w-full px-2 py-1 text-sm bg-bg-active border border-accent rounded text-text-primary focus:outline-none"
            />
            <button onClick={handleUpdate} className="text-green-500 hover:text-green-400 p-1"><Check size={14} /></button>
            <button onClick={() => { setIsEditing(false); setName(column.title); }} className="text-red-500 hover:text-red-400 p-1"><X size={14} /></button>
          </div>
        ) : (
          <h2 className="font-bold text-accent bg-accent-muted border border-accent/20 tracking-wide text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 flex-1 mr-2 truncate">
            <span className="truncate">{column.title}</span>
            <span className="bg-bg-secondary text-accent text-xs py-0.5 px-2 rounded-md font-extrabold shrink-0">
              {tasks.length}
            </span>
          </h2>
        )}
        
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={() => setIsEditing(true)}
              className="icon-action text-text-secondary hover:text-accent hover:bg-bg-hover p-1.5 rounded-lg transition-colors"
              title="Edit Column"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="icon-action text-text-secondary hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors"
              title="Delete Column"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => setShowCreateTask(true)}
              className="icon-action text-text-secondary hover:text-accent hover:bg-bg-hover p-1.5 rounded-lg transition-colors"
              title="Add Task"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Droppable Area for Tasks */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 min-h-37.5 transition-colors duration-200 ${
              snapshot.isDraggingOver ? "bg-[#1c1d22]/80" : "bg-transparent"
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} />
            ))}
            {/* This invisible element is required by the drag-and-drop library */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {showCreateTask && (
        <CreateTaskModal 
          isOpen={showCreateTask} 
          onClose={() => setShowCreateTask(false)} 
          columnId={column.id}
          boardId={boardId}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Column"
          message={`Are you sure you want to delete the column "${column.title}" and all its tasks? This action cannot be undone.`}
          confirmText="Delete Column"
          isDanger={true}
        />
      )}
    </div>
  );
}
