# Use Node.js 22 as base image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port Railway will use
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
