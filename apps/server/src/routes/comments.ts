import { requireAuth, AuthRequest } from "../middleware/auth";
import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

// ─── GET COMMENTS FOR A TASK ─────────────────────────────────
// GET /api/comments?taskId=xxx
router.get("/", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.query;

    if (!taskId) {
      res.status(400).json({ error: "taskId query parameter is required" });
      return;
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: taskId as string },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// ─── ADD A COMMENT ───────────────────────────────────────────
// POST /api/comments
// Body: { content, taskId }
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content, taskId } = req.body;
    const authorId = req.user!.id;

    if (!content || !taskId) {
      res.status(400).json({
        error: "Missing required fields: content and taskId",
      });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// ─── DELETE A COMMENT ────────────────────────────────────────
// DELETE /api/comments/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      res.status(400).json({ error: "id route parameter is required" });
      return;
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    if (comment.authorId !== req.user!.id) {
      res.status(403).json({ error: "You can only delete your own comments" });
      return;
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
