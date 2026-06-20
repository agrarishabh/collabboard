# Use Node.js 20 slim image
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy root package.json and workspace configurations
COPY package*.json ./
COPY turbo.json ./
COPY apps/server/package*.json ./apps/server/

# Install all dependencies (workspaces)
RUN npm install

# Copy Prisma schema specifically to generate client
COPY apps/server/prisma ./apps/server/prisma/

# Generate Prisma Client
RUN cd apps/server && npx prisma generate

# Copy the rest of the backend source code
COPY apps/server ./apps/server/

# Build the TypeScript code
RUN cd apps/server && npm run build

# Expose the server port
EXPOSE 5000

# Start the server using the compiled output
CMD ["node", "apps/server/dist/index.js"]
