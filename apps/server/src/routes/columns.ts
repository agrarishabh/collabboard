// ============================================================
// 📁 src/routes/columns.ts — Column CRUD Routes
// ============================================================
import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─── CREATE COLUMN ────────────────────────────────────────────
// POST /api/columns
// Body: { name: "To Do", boardId: "...", order?: 0 }
router.post("/", requireAuth, async (req: any, res: any) => {
  try {
    const { name, boardId, order } = req.body;

    if (!name || !boardId) {
      return res.status(400).json({ error: "Missing required fields: name and boardId" });
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: true }
    });

    if (!board) return res.status(404).json({ error: "Board not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: board.project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Only workspace members can create columns" });
    }

    // Determine order if not provided
    let finalOrder = order;
    if (finalOrder === undefined) {
      const lastColumn = await prisma.column.findFirst({
        where: { boardId },
        orderBy: { order: "desc" }
      });
      finalOrder = lastColumn ? lastColumn.order + 1 : 0;
    }

    const column = await prisma.column.create({
      data: {
        name,
        boardId,
        order: finalOrder
      }
    });

    return res.status(201).json(column);
  } catch (error) {
    console.error("Error creating column:", error);
    return res.status(500).json({ error: "Failed to create column" });
  }
});

// ─── UPDATE COLUMN ────────────────────────────────────────────
// PUT /api/columns/:id
// Body: { name: "New Name" }
router.put("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing required field: name" });
    }

    const columnToUpdate = await prisma.column.findUnique({
      where: { id },
      include: { board: { include: { project: true } } }
    });

    if (!columnToUpdate) return res.status(404).json({ error: "Column not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: columnToUpdate.board.project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Only workspace members can update columns" });
    }

    const updatedColumn = await prisma.column.update({
      where: { id },
      data: { name }
    });

    return res.json(updatedColumn);
  } catch (error) {
    console.error("Error updating column:", error);
    return res.status(500).json({ error: "Failed to update column" });
  }
});

// ─── DELETE COLUMN ────────────────────────────────────────────
// DELETE /api/columns/:id
router.delete("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = req.params.id as string;

    const columnToDelete = await prisma.column.findUnique({
      where: { id },
      include: { board: { include: { project: true } } }
    });

    if (!columnToDelete) return res.status(404).json({ error: "Column not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: columnToDelete.board.project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Only workspace members can delete columns" });
    }

    await prisma.column.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting column:", error);
    return res.status(500).json({ error: "Failed to delete column" });
  }
});

export default router;
