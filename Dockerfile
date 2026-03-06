# 1. Use a specific version for reproducibility
FROM node:22-alpine3.21

# 2. Install system dependencies early to cache this layer
RUN apk add --no-cache curl

# 3. Use a dedicated working directory
WORKDIR /app

# 4. Copy dependency files first to leverage build cache
COPY package*.json ./
RUN npm ci --only=production

# 5. Copy application code (owned by the node user)
COPY --chown=node:node . .

# 6. Switch to non-privileged user for security
USER node

# 7. Add healthcheck before the startup command
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail -H "Authorization: Bearer ${AUTHORIZATION_BEARER_TOKEN}" http://localhost:3000/supported || exit 1

# 8. Start the application
CMD ["node", "index.js"]
