// ============================================================
// 📁 src/routes/tasks.ts — Task CRUD Routes
// ============================================================
// Tasks are the core of CollabBoard — the cards on your Kanban board.
// This file handles creating, reading, updating, deleting,
// and MOVING tasks between columns (the drag-and-drop action!)
// ============================================================
import { requireAuth, AuthRequest } from "../middleware/auth";
import { Router } from "express";
import prisma from "../lib/prisma";
import { sendTaskAssignedEmail } from "../lib/email";

const router = Router();

// ─── CREATE TASK ─────────────────────────────────────────────
// POST /api/tasks
// Body: { title, columnId, description?, priority?, assigneeId? }
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, columnId, description, priority, assigneeId, labels } = req.body;
    const creatorId = req.user!.id;

    if (!title || !columnId) {
      res.status(400).json({
        error: "Missing required fields: title and columnId",
      });
      return;
    }

    // Find the highest 'order' value in this column
    // so the new task appears at the BOTTOM
    // aggregate = run math functions (max, min, count, avg) on the database
    const maxOrder = await prisma.task.aggregate({
      where: { columnId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        order: nextOrder,
        columnId,
        creatorId,
        assigneeId,
        labels: labels || [],
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    // Log the activity
    const columnData = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { include: { project: true } } }
    });
    
    const workspaceId = columnData?.board?.project?.workspaceId;
    if (workspaceId) {
      const activity = await prisma.activity.create({
        data: {
          action: "TASK_CREATED",
          details: { 
            taskTitle: task.title, 
            column: columnData?.name,
            boardName: columnData?.board?.name,
            projectName: columnData?.board?.project?.name
          },
          userId: creatorId,
          workspaceId: workspaceId
        },
        include: { user: { select: { id: true, name: true, image: true } } }
      });

      // Broadcast to everyone in the workspace
      const io = req.app.get("io");
      if (io) {
        io.to(`workspace_${workspaceId}`).emit("activity:new", activity);
      }
    }

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// ─── GET SINGLE TASK ─────────────────────────────────────────
// GET /api/tasks/:id
// Returns full task details including comments (for the task detail modal)
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, image: true, email: true },
        },
        creator: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "asc" }, // Oldest comments first (chat-like)
        },

        column: {
          include: {
            board: {
              include: { project: true }
            }
          }
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// ─── UPDATE TASK ─────────────────────────────────────────────
// PUT /api/tasks/:id
// Body: any task fields to update
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { title, description, priority, assigneeId, labels, dueDate } = req.body;

    const prevTask = await prisma.task.findUnique({
      where: { id },
      include: {
        column: { include: { board: { include: { project: { include: { workspace: true } } } } } }
      }
    });

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        // null means "unassign", a string means "assign to this user"
        ...(assigneeId !== undefined && { assigneeId }),
        ...(labels && { labels }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true, email: true },
        },
      },
    });

    if (assigneeId && prevTask?.assigneeId !== assigneeId) {
      if ((task as any).assignee?.email && ((prevTask as any)?.column?.board?.project?.workspace?.name || 'Unknown Workspace')) {
        sendTaskAssignedEmail(
          (task as any).assignee.email, 
          task.title, 
          ((prevTask as any)?.column?.board?.project?.workspace?.name || 'Unknown Workspace')
        );
      }
    }

    res.json(task);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "P2025") {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// ─── MOVE TASK (Drag & Drop!) ────────────────────────────────
// PATCH /api/tasks/:id/move
// Body: { columnId: "new-column-id", order: 2 }
//
// This is the MOST IMPORTANT endpoint for the Kanban board!
// When a user drags a task from "To Do" to "In Progress",
// the frontend calls this endpoint with the new column and position.
router.patch("/:id/move", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { columnId, order } = req.body;

    if (columnId === undefined || order === undefined) {
      res.status(400).json({
        error: "Missing required fields: columnId and order",
      });
      return;
    }

    // Use a TRANSACTION to ensure data consistency
    // If any query fails, ALL changes are rolled back
    // Why? Imagine we update the task's column but crash before
    // reordering — the board would be in a broken state!
    const updatedTask = await prisma.$transaction(async (tx) => {
      // Step 1: Move the task to the new column and position
      const task = await tx.task.update({
        where: { id },
        data: {
          columnId,
          order,
        },
      });

      // Step 2: Reorder other tasks in the target column
      // Push down all tasks that are at or after the new position
      await tx.task.updateMany({
        where: {
          columnId,
          id: { not: id }, // Don't update the task we just moved!
          order: { gte: order }, // gte = "greater than or equal to"
        },
        data: {
          order: { increment: 1 }, // Push each one down by 1
        },
      });

      // Step 3: Log the activity
      // To get workspaceId, we need to find it from the column -> board -> project -> workspace
      const columnData = await tx.column.findUnique({
        where: { id: columnId },
        include: { board: { include: { project: true } } }
      });
      
      const workspaceId = columnData?.board?.project?.workspaceId;
      if (workspaceId) {
        const activity = await tx.activity.create({
          data: {
            action: "TASK_MOVED",
            details: { 
              taskTitle: task.title, 
              column: columnData?.name,
              boardName: columnData?.board?.name,
              projectName: columnData?.board?.project?.name
            },
            userId: req.user!.id,
            workspaceId: workspaceId
          },
          include: { user: { select: { id: true, name: true, image: true } } }
        });

        // Broadcast to everyone in the workspace
        const io = req.app.get("io");
        if (io) {
          console.log(`📡 Emitting activity:new to workspace_${workspaceId}`, activity.action);
          io.to(`workspace_${workspaceId}`).emit("activity:new", activity);
        } else {
          console.log("❌ io instance not found on req.app");
        }
      }

      return task;
    });

    res.json(updatedTask);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "P2025") {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    console.error("Error moving task:", error);
    res.status(500).json({ error: "Failed to move task" });
  }
});

// ─── DELETE TASK ─────────────────────────────────────────────
// DELETE /api/tasks/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.task.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "P2025") {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;