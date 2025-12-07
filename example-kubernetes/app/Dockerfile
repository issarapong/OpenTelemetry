FROM node:18-alpine

# ติดตั้ง dependencies พื้นฐาน
RUN apk add --no-cache tini

# สร้าง app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# สร้าง non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use tini as init process
ENTRYPOINT ["/sbin/tini", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "app.js"]
