// ============================================================
// 📁 src/index.ts — The MAIN ENTRY POINT of our Express server
// ============================================================
import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http"; // Built-in Node module
import path from "path";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";

import healthRouter from "./routes/health";
import workspacesRouter from "./routes/workspaces";
import boardsRouter from "./routes/boards";
import tasksRouter from "./routes/tasks";
import projectsRouter from "./routes/projects";
import commentsRouter from "./routes/comments";
import documentsRouter from "./routes/documents";
import chatRouter from "./routes/chat";
import columnsRouter from "./routes/columns";

import { prisma } from "./lib/prisma";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// --- WEBSOCKET SETUP ---
// We wrap the Express app in a standard Node HTTP server
const httpServer = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Allow cookies so we can verify the NextAuth session!
  },
});

app.set("io", io);

// --- SOCKET SECURITY MIDDLEWARE ---

// 1. First, tell Socket.IO to parse the raw cookies!
io.use((socket, next) => {
  cookieParser()(socket.request as any, {} as any, (err?: any) => {
    if (err) return next(err);
    next();
  });
});

// 2. Then, run our security check
io.use(async (socket, next) => {
  try {
    const req = socket.request as any;
    
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error("NEXTAUTH_SECRET is not set in environment variables.");
    }

    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    socket.data.user = {
      id: token.sub,
      name: token.name,
    };
    
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// --- SOCKET CONNECTIONS ---
io.on("connection", (socket) => {
  console.log(`🔌 User connected via Socket.IO: ${socket.data.user?.name}`);

  // When a user opens a board, they "join" a room specific to that board
  socket.on("join_board", (boardId: string) => {
    socket.join(boardId);
    console.log(`👤 ${socket.data.user?.name} joined board: ${boardId}`);
  });

  // When a user drags and drops a task
  socket.on("task:move", (data: { boardId: string, sourceColId: string, destColId: string, taskId: string, newIndex: number }) => {
    // Broadcast this exact move to EVERYONE ELSE currently in this board's room
    // 'broadcast' means send to everyone EXCEPT the person who triggered it
    socket.to(data.boardId).emit("task:moved", data);
  });

  // Chat: join workspace chat
  socket.on("join_workspace_chat", (workspaceId: string) => {
    socket.join(`chat_${workspaceId}`);
    console.log(`💬 ${socket.data.user?.name} joined chat for workspace: ${workspaceId}`);
  });

  // Activity Feed: join workspace feed
  socket.on("join_workspace_feed", (workspaceId: string) => {
    socket.join(`workspace_${workspaceId}`);
    console.log(`🔔 ${socket.data.user?.name} joined activity feed for workspace: ${workspaceId}`);
  });

  // Chat: send message
  socket.on("chat:send_message", async (data: { workspaceId: string, content: string }) => {
    try {
      // 1. Save to database
      const savedMessage = await prisma.chatMessage.create({
        data: {
          content: data.content,
          workspaceId: data.workspaceId,
          senderId: socket.data.user.id,
        },
        include: {
          sender: { select: { id: true, name: true, image: true } }
        }
      });

      // 2. Broadcast to everyone in the room (including sender)
      io.to(`chat_${data.workspaceId}`).emit("chat:new_message", savedMessage);
    } catch (error) {
      console.error("Error saving chat message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.data.user?.name}`);
  });
});

// --- EXPRESS MIDDLEWARE ---
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true 
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Serve the uploads directory statically
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

app.use((req, _res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// --- ROUTES ---
app.use("/api/health", healthRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/columns", columnsRouter);


app.get("/", (_req, res) => {
  res.json({ message: "CollabBoard API with Socket.IO is running!" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// --- START THE SERVER ---
// IMPORTANT: We use httpServer.listen() instead of app.listen()!
httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🚀 CollabBoard API + Socket.IO             ║
  ║   Running on: http://localhost:${PORT}          ║
  ║   Environment: ${process.env.NODE_ENV || "development"}             ║
  ╚══════════════════════════════════════════════╝
  `);
});