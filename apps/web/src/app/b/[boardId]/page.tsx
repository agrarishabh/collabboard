"use client";
import { API_URL } from '@/lib/api';

import { useState, use, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import BoardColumn from "@/components/board/Column";
import { useSession } from "next-auth/react";
import { useSocket } from "@/components/SocketProvider";
import CreateColumnModal from "@/components/modals/CreateColumnModal";
import { Plus } from "lucide-react";

interface BoardTask {
  id: string;
  content: string;
  priority: string;
  _count?: { comments: number };
  assignee?: { name: string; image: string | null };
}

interface BoardData {
  boardName: string;
  projectName: string;
  columns: Record<string, { id: string; title: string; taskIds: string[] }>;
  tasks: Record<string, BoardTask>;
  columnOrder: string[];
}

export default function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = use(params);
  const { data: session, status } = useSession();
  const socket = useSocket(); // Grab our global WebSocket!
  
  const [data, setData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);

  // 1. INITIAL FETCH & JOIN SOCKET ROOM
  useEffect(() => {
    if (!session) return;

    // Join the multiplayer room for this specific board
    if (socket) {
      socket.emit("join_board", boardId);
    }

    fetch(`${API_URL}/api/boards/${boardId}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((boardFromServer) => {
        if (boardFromServer.error) {
          setIsLoading(false);
          return;
        }

        const transformedData: BoardData = { 
          boardName: boardFromServer.name,
          projectName: boardFromServer.project?.name || "Project",
          columns: {}, 
          tasks: {}, 
          columnOrder: [] 
        };

        boardFromServer.columns.forEach((col: { id: string; name: string; tasks: { id: string; title: string; priority: string; _count?: { comments?: number }; assignee?: { name: string; image?: string | null } }[] }) => {
          transformedData.columnOrder.push(col.id);
          const taskIds: string[] = [];

          col.tasks.forEach((task) => {
            taskIds.push(task.id);
            transformedData.tasks[task.id] = {
              id: task.id,
              content: task.title,
              priority: task.priority,
              _count: task._count ? { comments: task._count.comments ?? 0 } : undefined,
              assignee: task.assignee
                ? { name: task.assignee.name, image: task.assignee.image ?? null }
                : undefined,
            };
          });

          transformedData.columns[col.id] = {
            id: col.id,
            title: col.name,
            taskIds: taskIds,
          };
        });

        setData(transformedData);
        setIsLoading(false);
      });
  }, [boardId, session, socket]);


  // 2. LISTEN FOR OTHER PEOPLE'S MOVES
  useEffect(() => {
    if (!socket) return;

    // Listen for the "task:moved" event from the backend
    socket.on("task:moved", (moveData) => {
      console.log("Someone else moved a task!", moveData);
      
      setData((prev) => {
        if (!prev) return prev;
        
        const startCol = prev.columns[moveData.sourceColId];
        const finishCol = prev.columns[moveData.destColId];
        
        // Remove from old spot
        const startTaskIds = Array.from(startCol.taskIds);
        // Find the index of the task that was moved
        const taskIndex = startTaskIds.indexOf(moveData.taskId);
        if (taskIndex !== -1) startTaskIds.splice(taskIndex, 1);
        
        // Insert into new spot
        const finishTaskIds = startCol.id === finishCol.id ? startTaskIds : Array.from(finishCol.taskIds);
        finishTaskIds.splice(moveData.newIndex, 0, moveData.taskId);
        
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [startCol.id]: { ...startCol, taskIds: startTaskIds },
            [finishCol.id]: { ...finishCol, taskIds: finishTaskIds }
          }
        };
      });
    });

    return () => {
      socket.off("task:moved");
    };
  }, [socket]);


  // 3. BROADCAST YOUR OWN MOVES
  const onDragEnd = (result: DropResult) => {
    if (!data) return;
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startCol = data.columns[source.droppableId];
    const finishCol = data.columns[destination.droppableId];

    // Tell the WebSocket server that YOU moved a task!
    if (socket) {
      socket.emit("task:move", {
        boardId: boardId,
        sourceColId: startCol.id,
        destColId: finishCol.id,
        taskId: draggableId,
        newIndex: destination.index
      });
    }

    // Same Column Move
    if (startCol === finishCol) {
      const newTaskIds = Array.from(startCol.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newCol = { ...startCol, taskIds: newTaskIds };
      setData({ ...data, columns: { ...data.columns, [newCol.id]: newCol } });

      fetch(`${API_URL}/api/tasks/${draggableId}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ columnId: startCol.id, order: destination.index }),
      });
      return;
    }

    // Different Column Move
    const startTaskIds = Array.from(startCol.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStartCol = { ...startCol, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishCol.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinishCol = { ...finishCol, taskIds: finishTaskIds };

    setData({
      ...data,
      columns: { ...data.columns, [newStartCol.id]: newStartCol, [newFinishCol.id]: newFinishCol },
    });

    fetch(`${API_URL}/api/tasks/${draggableId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ columnId: finishCol.id, order: destination.index }),
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="page-shell min-h-screen bg-bg-secondary p-8">
        <div className="mb-8 space-y-3">
          <div className="skeleton-line h-8 w-80 rounded-lg" />
          <div className="skeleton-line h-4 w-32 rounded" />
        </div>
        <div className="flex gap-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface-panel h-[calc(100vh-160px)] w-80 rounded-2xl p-4">
              <div className="skeleton-line h-7 w-32 rounded-lg mb-5" />
              <div className="space-y-3">
                <div className="skeleton-line h-24 rounded-xl" />
                <div className="skeleton-line h-20 rounded-xl" />
                <div className="skeleton-line h-28 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-bg-secondary text-red-500 p-8">Board not found!</div>;

  return (
    <div className="page-shell min-h-screen bg-bg-secondary text-gray-200 p-8 font-sans">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="text-gray-400 font-medium">{data.projectName}</span>
            <span className="text-gray-500">/</span>
            <span>{data.boardName}</span>
          </h1>
          <p className="text-text-tertiary text-sm mt-1 font-medium">Kanban Board</p>
        </div>
        <button
          onClick={() => setIsCreateColumnModalOpen(true)}
          className="primary-action px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-xl transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Column
        </button>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-140px)]">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);
            return <BoardColumn key={column.id} column={column} tasks={tasks} boardId={boardId} />;
          })}
        </div>
      </DragDropContext>
      
      <CreateColumnModal
        isOpen={isCreateColumnModalOpen}
        onClose={() => setIsCreateColumnModalOpen(false)}
        boardId={boardId}
      />
    </div>
  );
}
