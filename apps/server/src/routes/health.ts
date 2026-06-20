// ============================================================
// 📁 src/routes/health.ts — Health Check Route
// ============================================================
// A "health check" route is a standard practice in backend development.
// It lets you (or monitoring tools) quickly verify:
// - Is the server running?
// - Can it connect to the database?
// - What's the uptime?
//
// DevOps tools (like AWS, Docker, Kubernetes) ping this route
// to decide if your server is healthy or needs to be restarted.
// ============================================================

import { Router } from "express";

// Router() creates a mini Express app that handles routes
// Think of it as a "sub-application" — we define routes on it,
// then plug it into the main app with app.use()
// Why? Organization! Instead of putting 100 routes in index.ts,
// we split them into files: health.ts, tasks.ts, auth.ts, etc.
const router = Router();

// GET /api/health
// When someone visits http://localhost:5000/api/health, this runs
// Note: we write "/" here (not "/api/health") because the parent
// already mounted us at "/api/health" in index.ts
router.get("/", async (_req, res) => {
  try {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())} seconds`,
      environment: process.env.NODE_ENV || "development",
      // We'll add database connectivity check here later
      // database: "connected" or "disconnected"
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// Export the router so index.ts can import it
export default router;