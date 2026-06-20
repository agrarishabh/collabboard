# CollabBoard

**Real-time Collaborative Project Management**

CollabBoard is a modern, real-time collaborative workspace designed to help teams organize, track, and manage their projects seamlessly.

## Features

- **Kanban Boards:** Visualize your workflow with customizable, drag-and-drop Kanban boards.
- **Real-time Document Editing:** Co-author documents simultaneously using Liveblocks integration.
- **Team Chat:** Communicate effortlessly with your team using real-time, persistent chat.
- **Activity Feed:** Stay up-to-date with a centralized feed tracking all project activities and updates.

## Tech Stack

- **Frontend:** Next.js 16, TailwindCSS
- **Backend:** Express, Node.js
- **Database:** PostgreSQL, Prisma ORM
- **Real-time Engine:** Socket.io (for chat and activity), Liveblocks (for document collaboration)

## Setup Instructions

Follow these steps to get the project running locally:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Set up your `.env` file with the necessary credentials (e.g., Database URL, Liveblocks keys, API URLs).

3. **Set up the database:**
   ```bash
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
