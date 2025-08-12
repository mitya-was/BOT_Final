# Node 20 Alpine for small image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the source
COPY . .

# Environment
ENV NODE_ENV=production

# No ports exposed; the bot works via polling

# Start bot
CMD ["npm", "start"]
