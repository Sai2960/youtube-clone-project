# Use Node 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only server folder
COPY server/package*.json ./

# Install dependencies
RUN npm install --production

# Copy server code
COPY server/ ./

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]