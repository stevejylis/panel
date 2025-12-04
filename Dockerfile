# ===========================================
# NEONPULSE SERVER MONITOR - DOCKERFILE
# Multi-stage build: Frontend + Backend
# ===========================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files and install deps
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ===========================================
# Stage 2: Production Image
# ===========================================
FROM node:20-alpine AS production

# Install system utilities for metrics and logs
RUN apk add --no-cache \
    procps \
    util-linux \
    iproute2 \
    curl

WORKDIR /app

# Copy backend package files and install deps
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/server.js ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./public

# Create static file server module
RUN cat > static.js << 'EOF'
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const serveStatic = (app) => {
  app.use(express.static(path.join(__dirname, "public")));

  // SPA fallback - serve index.html for non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
};
EOF

# Inject static serving into server.js
RUN sed -i "s|app.listen|import { serveStatic } from './static.js'; serveStatic(app);\n\napp.listen|" server.js

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check using curl with IPv4
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
