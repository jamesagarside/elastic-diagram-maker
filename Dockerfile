# Use Node.js as the base image
FROM node:18-alpine as build

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React application
RUN npm run build

# Use a smaller Node.js image for the production environment
FROM node:18-alpine as production

# Set the working directory
WORKDIR /app

# Copy the server files
COPY server.js ./server.js
COPY telemetry.js ./telemetry.js

# Create a build directory and copy all the build files there (including subdirectories)
COPY --from=build /app/build ./build

# Install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Expose the port on which the app will run
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# OpenTelemetry environment variables
# These should be provided at runtime, examples:
# ENV OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4318
# ENV OTEL_EXPORTER_OTLP_HEADERS=api-key=your-api-key,authorization=your-auth-token
# ENV OTEL_RESOURCE_ATTRIBUTES=deployment.environment=prod,service.instance.id=instance-1

# Start the server in production mode
CMD ["node", "-e", "process.env.NODE_ENV='production'; require('./server.js')"]
