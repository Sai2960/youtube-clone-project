# ✅ Use Node 20 instead of 18
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# ✅ CRITICAL: Clean install with updated dependencies
RUN npm ci --only=production --ignore-scripts || npm install --only=production

# Copy server code
COPY server/ ./

# Create necessary directories
RUN mkdir -p uploads/videos uploads/channel-images uploads/shorts/videos uploads/shorts/thumbnails invoices

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "index.js"]