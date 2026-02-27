FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the development port
EXPOSE 5173

# Run the development server
# Note: --host is necessary for Docker to allow external access
CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]
