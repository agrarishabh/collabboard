"use client";

import { type CSSProperties, useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, MessageSquare } from "lucide-react";
import Image from "next/image";
import TaskDetailModal from "../modals/TaskDetailModal";

interface TaskCardProps {
  task: { 
    id: string; 
    content: string; 
    priority: string;
    _count?: { comments: number };
    assignee?: { name: string; image: string | null };
  };
  index: number;
}

export default function TaskCard({ task, index }: TaskCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  // A helper to pick sleek colors based on priority
  const priorityColors: Record<string, string> = {
    HIGH: "bg-red-500/10 text-red-400 border-red-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    DONE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  const badgeColor = priorityColors[task.priority] || "bg-gray-800 text-gray-400 border-gray-700";

  return (
    <>
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => {
        const { style, ...draggableProps } = provided.draggableProps;

        return (
          <div
            ref={provided.innerRef}
            {...draggableProps}
            {...provided.dragHandleProps}
            style={style as CSSProperties}
            onClick={() => setShowDetail(true)}
            className={`task-card group relative p-4 mb-3 rounded-xl border transition-all duration-200 cursor-pointer ${
              snapshot.isDragging
                ? "bg-[#2a2b30] border-indigo-500/50 shadow-2xl shadow-black/50 rotate-2 scale-105"
                : "bg-[#1c1d21] border-[#2f3037] hover:border-[#3f4048]"
            }`}
          >
          {/* Subtle drag handle icon that appears on hover */}
          <div className="absolute right-3 top-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={16} />
          </div>

          <p className="text-gray-200 font-medium text-sm pr-6 leading-relaxed">
            {task.content}
          </p>

          <div className="mt-4 flex justify-between items-end">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${badgeColor}`}>
              {task.priority}
            </span>
            
            <div className="flex items-center gap-3">
              {task._count && task._count.comments > 0 && (
                <div className="flex items-center gap-1 text-text-tertiary group-hover:text-accent transition-colors">
                  <MessageSquare size={14} />
                  <span className="text-xs font-semibold">{task._count.comments}</span>
                </div>
              )}
              {task.assignee && (
                <div 
                  className="w-6 h-6 rounded-full bg-accent-muted border border-accent flex items-center justify-center shrink-0"
                  title={`Assigned to ${task.assignee.name}`}
                >
                  {task.assignee.image ? (
                    <Image src={task.assignee.image} alt={task.assignee.name} width={24} height={24} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-accent">
                      {task.assignee.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        );
      }}
    </Draggable>
    <TaskDetailModal 
      isOpen={showDetail}
      onClose={() => setShowDetail(false)}
      taskId={task.id}
    />
    </>
  );
}
