import express from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// 1. GET /api/projects?workspaceId=xxx - List projects in a workspace
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

    const projects = await prisma.project.findMany({
      where: { workspaceId: String(workspaceId) },
      include: {
        boards: {
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: "asc" }
        },
        _count: {
          select: { boards: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(projects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// 2. POST /api/projects - Create a new project
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { name, description, workspaceId } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({ error: "name and workspaceId are required" });
    }

    // Security check: Must be ADMIN or OWNER to create projects
    const member = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId: String(workspaceId),
          userId: req.user.id,
        },
      },
    });

    if (!member || member.status !== "ACCEPTED" || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return res.status(403).json({ error: "Only admins can create projects" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
      },
    });

    // Log the activity
    const activity = await prisma.activity.create({
      data: {
        action: "PROJECT_CREATED",
        details: { projectName: project.name },
        userId: req.user.id,
        workspaceId: workspaceId
      },
      include: { user: { select: { id: true, name: true, image: true } } }
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`workspace_${workspaceId}`).emit("activity:new", activity);
    }

    res.status(201).json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// 3. PUT /api/projects/:id - Update a project
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;

    const projectToUpdate = await prisma.project.findUnique({
      where: { id },
      select: { workspaceId: true }
    });

    if (!projectToUpdate) return res.status(404).json({ error: "Project not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: projectToUpdate.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED" || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return res.status(403).json({ error: "Only admins can update projects" });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { name, description }
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// 4. DELETE /api/projects/:id - Delete a project
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;

    const projectToDelete = await prisma.project.findUnique({
      where: { id },
      select: { workspaceId: true }
    });

    if (!projectToDelete) return res.status(404).json({ error: "Project not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: projectToDelete.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED" || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return res.status(403).json({ error: "Only admins can delete projects" });
    }

    await prisma.project.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// 5. GET /api/projects/:id/analytics - Project Analytics
router.get("/:id/analytics", requireAuth, async (req: any, res) => {
  try {
    const id = req.params.id as string;

    // Verify user is a member of the workspace this project belongs to
    const project = await prisma.project.findUnique({
      where: { id },
      select: { workspaceId: true }
    });

    if (!project) return res.status(404).json({ error: "Project not found" });

    const member = await prisma.member.findUnique({
      where: { userId_workspaceId: { workspaceId: project.workspaceId, userId: req.user.id } }
    });

    if (!member || member.status !== "ACCEPTED") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch all tasks in this project
    const tasks = await prisma.task.findMany({
      where: {
        column: {
          board: {
            projectId: id
          }
        }
      },
      include: {
        column: true,
        assignee: true
      }
    });

    // Calculate Stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.column.name.toLowerCase().includes('done') || t.column.name.toLowerCase().includes('completed')).length;
    
    // Tasks by Member
    const tasksByMember: Record<string, { name: string, count: number }> = {};
    tasks.forEach(task => {
      if ((task as any).assignee) {
        if (!tasksByMember[(task as any).assignee.id]) {
          tasksByMember[(task as any).assignee.id] = { name: (task as any).assignee.name || 'Unknown', count: 0 };
        }
        tasksByMember[(task as any).assignee.id].count++;
      } else {
        if (!tasksByMember['unassigned']) {
          tasksByMember['unassigned'] = { name: 'Unassigned', count: 0 };
        }
        tasksByMember['unassigned'].count++;
      }
    });

    // Tasks by Column
    const tasksByColumn: Record<string, number> = {};
    tasks.forEach(task => {
      tasksByColumn[task.column.name] = (tasksByColumn[task.column.name] || 0) + 1;
    });

    res.json({
      overview: { totalTasks, completedTasks, pendingTasks: totalTasks - completedTasks },
      tasksByMember: Object.values(tasksByMember),
      tasksByColumn: Object.entries(tasksByColumn).map(([name, count]) => ({ name, count }))
    });

  } catch (error) {
    console.error("Project Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch project analytics" });
  }
});

export default router;
