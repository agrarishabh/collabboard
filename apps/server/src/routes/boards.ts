// ============================================================
// 📁 src/routes/boards.ts — Board CRUD Routes
// ============================================================
// A Board is a Kanban board inside a project.
// When you create a board, we automatically create 3 default columns:
// "To Do", "In Progress", and "Done" — so it's ready to use immediately!
// ============================================================

import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── CREATE BOARD ────────────────────────────────────────────
// POST /api/boards
// Body: { name: "Sprint 1", projectId: "..." }
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { name, projectId } = req.body;

    if (!name || !projectId) {
      res.status(400).json({
        error: "Missing required fields: name and projectId",
      });
      return;
    }

    // Security Check: Must be an accepted member of the workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true }
    });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Only workspace members can create boards" });
    }

    // Create the board WITH default columns in one query!
    const board = await prisma.board.create({
      data: {
        name,
        projectId,
        columns: {
          create: [
            { name: "To Do", order: 0 },
            { name: "In Progress", order: 1 },
            { name: "Done", order: 2 },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: {
            tasks: true,
          },
        },
        project: true
      },
    });

    const workspaceId = board.project?.workspaceId;
    if (workspaceId) {
      const activity = await prisma.activity.create({
        data: {
          action: "BOARD_CREATED",
          details: { 
            boardName: board.name,
            projectName: board.project.name
          },
          userId: req.user.id,
          workspaceId: workspaceId
        },
        include: { user: { select: { id: true, name: true, image: true } } }
      });

      const io = req.app.get("io");
      if (io) {
        io.to(`workspace_${workspaceId}`).emit("activity:new", activity);
      }
    }

    res.status(201).json(board);
  } catch (error) {
    console.error("Error creating board:", error);
    res.status(500).json({ error: "Failed to create board" });
  }
});

// ─── GET BOARD WITH ALL DATA ─────────────────────────────────
// GET /api/boards/:id
// This is the MAIN endpoint for the Kanban view!
// Returns the board with ALL columns, ALL tasks, and task details
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id as string;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                // Include assignee info (name, image) for each task card
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
                // Include comment count (shown as a badge on the card)
                _count: {
                  select: { comments: true },
                },
              },
            },
          },
        },
        project: true, // Include parent project info
      },
    });

    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    res.json(board);
  } catch (error) {
    console.error("Error fetching board:", error);
    res.status(500).json({ error: "Failed to fetch board" });
  }
});

// ─── LIST BOARDS IN A PROJECT ────────────────────────────────
// GET /api/boards?projectId=xxx
router.get("/", requireAuth, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      res.status(400).json({ error: "projectId query parameter is required" });
      return;
    }

    const boards = await prisma.board.findMany({
      where: { projectId: projectId as string },
      include: {
        _count: {
          select: { columns: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(boards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    res.status(500).json({ error: "Failed to fetch boards" });
  }
});

// ─── UPDATE BOARD ────────────────────────────────────────────
// PUT /api/boards/:id
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    const boardToUpdate = await prisma.board.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!boardToUpdate) return res.status(404).json({ error: "Board not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: boardToUpdate.project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Only workspace members can update boards" });
    }

    const updated = await prisma.board.update({
      where: { id },
      data: { name }
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating board:", error);
    res.status(500).json({ error: "Failed to update board" });
  }
});

// ─── DELETE BOARD ────────────────────────────────────────────
// DELETE /api/boards/:id
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;

    const boardToDelete = await prisma.board.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!boardToDelete) return res.status(404).json({ error: "Board not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: boardToDelete.project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Only workspace members can delete boards" });
    }

    await prisma.board.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting board:", error);
    res.status(500).json({ error: "Failed to delete board" });
  }
});

export default router;