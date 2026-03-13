FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package.json package-lock.json* ./

# Install dependencies (amqplib, etc.)
RUN npm install

# Copy the actual code
COPY . .

# Run the listener
CMD ["npm", "run", "dev"]