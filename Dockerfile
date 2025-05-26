# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Don't remove dev dependencies as they're needed for Vite at runtime

# Expose port 5010
EXPOSE 5010

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]