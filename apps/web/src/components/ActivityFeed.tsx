"use client";
import { API_URL } from '@/lib/api';

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, LayoutGrid, CheckSquare, Settings, FileText } from "lucide-react";
import Image from "next/image";
import { useSocket } from './SocketProvider';

interface ActivityDetails {
  taskTitle?: string;
  boardName?: string;
  projectName?: string;
  column?: string;
  documentTitle?: string;
  memberName?: string;
}

interface ActivityItem {
  id: string;
  action: string;
  details: ActivityDetails | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

export default function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    // 1. Fetch initial activities
    fetch(`${API_URL}/api/workspaces/${workspaceId}/activities`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        }
        setIsLoading(false);
      });
  }, [workspaceId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("join_workspace_feed", workspaceId);

    const handleNewActivity = (newActivity: ActivityItem) => {
      setActivities((prev) => [newActivity, ...prev]);
    };

    socket.on("activity:new", handleNewActivity);

    return () => {
      socket.off("activity:new", handleNewActivity);
    };
  }, [socket, workspaceId]);

  const getActionIcon = (action: string) => {
    if (action.includes("TASK")) return <CheckSquare size={14} className="text-accent" />;
    if (action.includes("PROJECT") || action.includes("BOARD")) return <LayoutGrid size={14} className="text-blue-400" />;
    if (action.includes("MEMBER")) return <Settings size={14} className="text-purple-400" />;
    if (action.includes("DOCUMENT")) return <FileText size={14} className="text-green-400" />;
    return <Activity size={14} className="text-gray-400" />;
  };

  const getActionText = (activity: ActivityItem) => {
    const { action, details, user } = activity;
    const detail = details ?? {};
    const name = <span className="font-semibold text-text-primary">{user.name}</span>;
    
    switch (action) {
      case "TASK_CREATED":
        return <>{name} created task <b>{detail.taskTitle}</b> in <b>{detail.boardName || "Board"}</b> / <b>{detail.projectName || "Project"}</b></>;
      case "TASK_MOVED":
        return <>{name} moved task <b>{detail.taskTitle}</b> to {detail.column} in <b>{detail.boardName || "Board"}</b> / <b>{detail.projectName || "Project"}</b></>;
      case "PROJECT_CREATED":
        return <>{name} created a new project: <b>{detail.projectName}</b></>;
      case "BOARD_CREATED":
        return <>{name} created a new board <b>{detail.boardName}</b> in <b>{detail.projectName}</b></>;
      case "DOCUMENT_CREATED":
        return <>{name} created a new document: <b>{detail.documentTitle}</b></>;
      case "MEMBER_ADDED":
        return <>{name} added <b>{detail.memberName}</b> to the workspace</>;
      case "MEMBER_REMOVED":
        return <>{name} removed <b>{detail.memberName}</b> from the workspace</>;
      default:
        return <>{name} performed {action.replace(/_/g, " ").toLowerCase()}</>;
    }
  };

  if (isLoading) {
    return (
      <div className="surface-panel rounded-xl p-5 h-full min-h-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="surface-panel rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-border-subtle bg-bg-primary flex items-center gap-2">
        <Activity size={18} className="text-accent" />
        <h3 className="font-bold text-text-primary">Activity Feed</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activities.length === 0 ? (
          <div className="text-center text-text-tertiary py-10 text-sm">
            No recent activity in this workspace.
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 rounded-xl p-2 -m-2 transition-colors hover:bg-bg-hover">
              {/* Avatar */}
              <div className="shrink-0 mt-1">
                {activity.user.image ? (
                  <Image src={activity.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full ring-2 ring-bg-surface" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center justify-center font-bold text-xs ring-2 ring-bg-surface">
                    {activity.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-secondary leading-snug">
                  {getActionText(activity)}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {getActionIcon(activity.action)}
                  <span className="text-[11px] text-text-tertiary">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
