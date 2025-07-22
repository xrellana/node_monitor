# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Create database directory and set permissions
RUN mkdir -p /app/db && \
    chown -R nodeuser:nodejs /app && \
    chmod 755 /app/db

# Copy application code
COPY --chown=nodeuser:nodejs . .

# Switch to non-root user
USER nodeuser

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/app/db/monitor.db

# Create database directory with correct permissions
RUN mkdir -p /app/db && \
    node scripts/init-db.js

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["npm", "start"]