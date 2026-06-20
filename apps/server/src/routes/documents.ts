import express from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// 1. GET /api/documents?workspaceId=xxx - List documents in a workspace
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId is required" });
    }

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

    const documents = await prisma.document.findMany({
      where: { workspaceId: String(workspaceId) },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(documents);
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// 2. GET /api/documents/:id - Get document metadata
router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        workspace: {
          select: { name: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Security check: Make sure user is a member of this workspace
    const member = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId: document.workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    // Exclude 'content' (Bytes) from JSON response as we only need metadata for breadcrumbs
    const { data, ...metadata } = document;
    res.json(metadata);
  } catch (error: any) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// 3. POST /api/documents - Create a new document
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { title, workspaceId } = req.body;

    if (!title || !workspaceId) {
      return res.status(400).json({ error: "title and workspaceId are required" });
    }

    // Security check: Make sure user is a member
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

    const document = await prisma.document.create({
      data: {
        title,
        workspaceId,
      },
    });

    // Log activity
    const activity = await prisma.activity.create({
      data: {
        action: "DOCUMENT_CREATED",
        details: { documentTitle: document.title },
        userId: req.user.id,
        workspaceId: workspaceId
      },
      include: { user: { select: { id: true, name: true, image: true } } }
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`workspace_${workspaceId}`).emit("activity:new", activity);
    }

    res.status(201).json({
      id: document.id,
      title: document.title,
      workspaceId: document.workspaceId,
    });
  } catch (error: any) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// 4. PUT /api/documents/:id - Update document title
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    // Find doc to check workspace
    const existingDoc = await prisma.document.findUnique({ where: { id } });
    if (!existingDoc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Security check
    const member = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId: existingDoc.workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Not a member of this workspace" });
    }

    const document = await prisma.document.update({
      where: { id },
      data: { title },
      select: {
        id: true,
        title: true,
      },
    });

    res.json(document);
  } catch (error: any) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// 5. DELETE /api/documents/:id - Delete a document
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;

    const existingDoc = await prisma.document.findUnique({ where: { id } });
    if (!existingDoc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Security check
    const member = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId: existingDoc.workspaceId,
          userId: req.user.id,
        },
      },
    });

    if (!member || member.status !== "ACCEPTED" || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return res.status(403).json({ error: "Only admins can delete documents" });
    }

    await prisma.document.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
