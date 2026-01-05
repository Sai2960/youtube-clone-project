# Use Node 22 (matches your Nixpacks setup)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files from ROOT (not server/)
COPY package*.json ./

# Clean install without cache issues
RUN npm ci --omit=dev --prefer-offline=false && \
    rm -rf /root/.npm /tmp/*

# Copy all application code
COPY . .

# Create necessary directories
RUN mkdir -p \
    server/uploads/videos \
    server/uploads/channel-images \
    server/uploads/shorts/videos \
    server/uploads/shorts/thumbnails \
    server/invoices

# Expose port (Railway uses PORT env var, default to 8080)
EXPOSE 8080
# Health check - more lenient for Railway
HEALTHCHECK --interval=20s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
  
# Start the application
CMD ["node", "index.js"]