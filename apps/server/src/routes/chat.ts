import express from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// GET /api/chat/:workspaceId - Fetch recent chat history
router.get("/:workspaceId", requireAuth, async (req: any, res) => {
  try {
    const { workspaceId } = req.params;

    // Security check: Make sure user is a member of this workspace
    const member = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId: String(workspaceId),
          userId: req.user.id,
        },
      },
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    // Fetch the last 50 messages
    const messages = await prisma.chatMessage.findMany({
      where: { workspaceId: String(workspaceId) },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Prisma returns them newest first (desc). We want oldest first for display.
    res.json(messages.reverse());
  } catch (error: any) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

export default router;
