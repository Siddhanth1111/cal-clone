FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
# Add the flag here to bypass the React 19 dependency conflict
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5173

# We use --host to make it accessible outside the container
CMD ["npm", "run", "dev"]