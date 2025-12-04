# ===========================================
# NEONPULSE SERVER MONITOR - DOCKERFILE
# Multi-stage build: Frontend + Backend
# ===========================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build for production
RUN npm run build

# ===========================================
# Stage 2: Production Image
# ===========================================
FROM node:20-alpine AS production

# Install system utilities for log reading
RUN apk add --no-cache \
    procps \
    util-linux \
    lm-sensors \
    iproute2

WORKDIR /app

# Copy backend
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

# Copy built frontend to be served by backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Create static file serving in backend
RUN echo 'import express from "express"; import path from "path"; import { fileURLToPath } from "url"; const __dirname = path.dirname(fileURLToPath(import.meta.url)); export const serveStatic = (app) => { app.use(express.static(path.join(__dirname, "public"))); app.get("*", (req, res, next) => { if (req.path.startsWith("/api") || req.path === "/health") return next(); res.sendFile(path.join(__dirname, "public", "index.html")); }); };' > static.js

# Modify server to serve static files
RUN sed -i "s|app.listen|import { serveStatic } from './static.js'; serveStatic(app);\n\napp.listen|" server.js

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run the server
CMD ["node", "server.js"]
