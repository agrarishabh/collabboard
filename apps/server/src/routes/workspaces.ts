// ============================================================
// 📁 src/routes/workspaces.ts — Workspace CRUD Routes
// ============================================================
// These routes handle creating, reading, updating, and deleting
// workspaces. A workspace is like a "team" — e.g., "IIITM Dev Club".
//
// Routes:
//   POST   /api/workspaces        → Create a new workspace
//   GET    /api/workspaces        → List all workspaces
//   GET    /api/workspaces/:id    → Get a single workspace by ID
//   PUT    /api/workspaces/:id    → Update a workspace
//   DELETE /api/workspaces/:id    → Delete a workspace
// ============================================================

import { Router, type Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendWorkspaceInvitationEmail } from "../lib/email";

const router = Router();

const getRouteParam = (
  value: string | string[] | undefined,
  name: string,
  res: Response
): string | null => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    res.status(400).json({ error: `${name} route parameter is required` });
    return null;
  }

  return param;
};

// ─── CREATE WORKSPACE (SECURED) ──────────────────────────────────
// Now using requireAuth middleware and AuthRequest type!
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    
    // SECURE: We no longer ask the frontend for the userId.
    // We pull it directly from the decrypted NextAuth token!
    const userId = req.user!.id; 

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        slug,
        members: {
          create: {
            userId,      // Safe and verified!
            role: "OWNER",
            status: "ACCEPTED",
          },
        },
      },
      include: { members: { include: { user: true } } },
    });

    res.status(201).json(workspace);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "P2002") {
      res.status(409).json({ error: "A workspace with this name already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create workspace" });
  }
});

// ─── LIST ALL WORKSPACES (SECURED) ───────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // SECURE: We ONLY return workspaces where the logged-in user is an ACCEPTED member!
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { 
            userId,
            status: "ACCEPTED"
          },
        },
      },
      include: {
        _count: {
          select: {
            members: { where: { status: "ACCEPTED" } },
            projects: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch workspaces" });
  }
});

// ─── LIST PENDING INVITATIONS (SECURED) ───────────────────────
router.get("/invitations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Return workspaces where the user is a PENDING member
    const invitations = await prisma.workspace.findMany({
      where: {
        members: {
          some: { 
            userId,
            status: "PENDING"
          },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true, createdAt: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});
// ─── GET SINGLE WORKSPACE ────────────────────────────────────
// GET /api/workspaces/:id
// The ':id' is a URL parameter — Express extracts it into req.params.id
// Example: GET /api/workspaces/abc-123 → req.params.id = "abc-123"
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;

    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } },
    });

    if (!membership || membership.status !== "ACCEPTED") {
      res.status(403).json({ error: "Not an accepted member of this workspace" });
      return;
    }

    // findUnique = find exactly ONE record by a unique field (id, email, slug)
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: "ACCEPTED" },
          include: {
            user: true,
          },
        },
        projects: {
          include: {
            _count: {
              select: { boards: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      // 404 = "Not Found" — the resource doesn't exist
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    res.json(workspace);
  } catch (error) {
    console.error("Error fetching workspace:", error);
    res.status(500).json({ error: "Failed to fetch workspace" });
  }
});

// ─── UPDATE WORKSPACE ────────────────────────────────────────
// PUT /api/workspaces/:id
// Body: { name: "New Name", description: "New description" }
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;
    const { name, description } = req.body;

    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } }
    });

    if (!membership || membership.status !== "ACCEPTED" || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      res.status(403).json({ error: "Only owners and admins can update the workspace" });
      return;
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        // Only update fields that were actually sent
        // If name is undefined, Prisma skips it (doesn't overwrite)
        ...(name && { name }),
        ...(description !== undefined && { description }),
        // Also update slug if name changed
        ...(name && {
          slug: name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        }),
      },
    });

    res.json(workspace);
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "P2025") {
      // P2025 = record not found for update
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    console.error("Error updating workspace:", error);
    res.status(500).json({ error: "Failed to update workspace" });
  }
});

// ─── DELETE WORKSPACE ────────────────────────────────────────
// DELETE /api/workspaces/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;

    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } }
    });

    if (!membership || membership.status !== "ACCEPTED" || membership.role !== "OWNER") {
      res.status(403).json({ error: "Only the workspace owner can delete the workspace" });
      return;
    }

    // Because we set onDelete: Cascade in the schema,
    // deleting a workspace automatically deletes:
    // → all members, projects, boards, columns, tasks, comments
    // One line, and the entire tree is gone!
    await prisma.workspace.delete({
      where: { id },
    });

    // 204 = "No Content" — deletion was successful, nothing to return
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === "P2025") {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    console.error("Error deleting workspace:", error);
    res.status(500).json({ error: "Failed to delete workspace" });
  }
});
// ─── GET WORKSPACE MEMBERS ─────────────────────────────────────
router.get("/:id/members", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;
    
    // Security check: Make sure user is a member
    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } }
    });

    if (!membership || membership.status !== "ACCEPTED") {
      res.status(403).json({ error: "Not an accepted member of this workspace" });
      return;
    }

    const members = await prisma.member.findMany({
      where: { workspaceId: id, status: "ACCEPTED" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      },
      orderBy: { role: 'asc' } // OWNER first, then ADMIN, then MEMBER
    });

    res.json(members);
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// ─── INVITE A NEW MEMBER ──────────────────────────────────────────
router.post("/:id/members", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;
    const { email, role } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required to invite a member" });
      return;
    }


    if (!email) {
      res.status(400).json({ error: "Email is required to invite a member" });
      return;
    }

    if (role && !["ADMIN", "MEMBER"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    // Security check: Must be owner or admin to invite
    const currentMember = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } },
      include: { workspace: true, user: true }
    });

    if (!currentMember || currentMember.status !== "ACCEPTED" || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
      res.status(403).json({ error: "Only accepted owners and admins can invite members" });
      return;
    }

    // Find the user by email
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    
    if (!userToAdd) {
      res.status(404).json({ error: "No user found with that email address" });
      return;
    }

    // Check if already a member
    const existingMembership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: userToAdd.id } }
    });

    if (existingMembership) {
      res.status(400).json({ error: "User is already a member of this workspace" });
      return;
    }

    const newMember = await prisma.member.create({
      data: {
        workspaceId: id,
        userId: userToAdd.id,
        role: role || "MEMBER",
        status: "PENDING"
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      }
    });

    // Send the email notification
    sendWorkspaceInvitationEmail(
      email,
      currentMember.workspace.name,
      currentMember.user.name || "A team member"
    );

    res.status(201).json(newMember);
  } catch (error) {
    console.error("Error adding workspace member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// ─── REMOVE A MEMBER ──────────────────────────────────────────────
router.delete("/:id/members/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;

    const userId = getRouteParam(req.params.userId, "userId", res);
    if (!userId) return;

    // Security check: Must be owner or admin to remove others
    const currentMember = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } }
    });

    if (!currentMember || currentMember.status !== "ACCEPTED") {
      res.status(403).json({ error: "Not an accepted member of this workspace" });
      return;
    }

    // Cannot remove yourself through this endpoint
    if (currentMember.userId === userId) {
      res.status(400).json({ error: "Cannot remove yourself. Use the leave workspace feature." });
      return;
    }

    // Only Owner and Admin can remove people
    if (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN") {
      res.status(403).json({ error: "Only owners and admins can remove members" });
      return;
    }

    // Get the target member to check their role
    const targetMember = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId } },
      include: { user: true }
    });

    if (!targetMember) {
      res.status(404).json({ error: "User is not a member of this workspace" });
      return;
    }

    // Admins cannot remove Owners
    if (currentMember.role === "ADMIN" && targetMember.role === "OWNER") {
      res.status(403).json({ error: "Admins cannot remove workspace owners" });
      return;
    }

    await prisma.member.delete({
      where: { userId_workspaceId: { workspaceId: id, userId } }
    });

    // Log activity
    const activity = await prisma.activity.create({
      data: {
        action: "MEMBER_REMOVED",
        details: { memberName: targetMember.user?.name || "A member" },
        userId: req.user!.id,
        workspaceId: id
      },
      include: { user: { select: { id: true, name: true, image: true } } }
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`workspace_${id}`).emit("activity:new", activity);
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error removing workspace member:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
});


// ─── GET WORKSPACE ACTIVITIES ─────────────────────────────────────
router.get("/:id/activities", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;
    
    // Security check: Make sure user is a member
    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId: req.user!.id } }
    });

    if (!membership || membership.status !== "ACCEPTED") {
      res.status(403).json({ error: "Not an accepted member of this workspace" });
      return;
    }

    const activities = await prisma.activity.findMany({
      where: { workspaceId: id },
      include: {
        user: { select: { id: true, name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // only fetch latest 50
    });

    res.json(activities);
  } catch (error) {
    console.error("Error fetching workspace activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// ─── ACCEPT INVITATION ───────────────────────────────────────────
router.put("/:id/members/accept", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;
    const userId = req.user!.id;

    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId } }
    });

    if (!membership || membership.status !== "PENDING") {
      res.status(404).json({ error: "No pending invitation found" });
      return;
    }

    const updated = await prisma.member.update({
      where: { userId_workspaceId: { workspaceId: id, userId } },
      data: { status: "ACCEPTED" },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    const activity = await prisma.activity.create({
      data: {
        action: "MEMBER_ADDED",
        details: { memberName: updated.user?.name || "A member" },
        userId,
        workspaceId: id,
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`workspace_${id}`).emit("activity:new", activity);
    }

    res.json(updated);
  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// ─── REJECT INVITATION ───────────────────────────────────────────
router.put("/:id/members/reject", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getRouteParam(req.params.id, "id", res);
    if (!id) return;
    const userId = req.user!.id;

    const membership = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: id, userId } }
    });

    if (!membership || membership.status !== "PENDING") {
      res.status(404).json({ error: "No pending invitation found" });
      return;
    }

    await prisma.member.delete({
      where: { userId_workspaceId: { workspaceId: id, userId } }
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error rejecting invitation:", error);
    res.status(500).json({ error: "Failed to reject invitation" });
  }
});

export default router;
