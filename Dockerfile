# Use Node 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy ALL server code and folders
COPY server/ ./

# Expose port
EXPOSE 5000

# Start command (index.js is now directly in /app, not /app/server)
CMD ["node", "index.js"]