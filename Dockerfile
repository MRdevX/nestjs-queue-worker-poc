# Stage 1: Build
FROM node:lts-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Enable Corepack and use the specified Yarn version
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy package manager configuration files
COPY package.json yarn.lock .yarnrc.yml ./

# Copy Yarn berry files
COPY .yarn ./.yarn

# Install dependencies
RUN yarn install --immutable

# Copy the entire application code
COPY . .

# Build the application
RUN yarn build

# Verify the build output exists
RUN ls -la dist && \
    if [ ! -f dist/main.js ]; then \
    echo "dist/main.js not found!" && exit 1; \
    fi

# Stage 2: Run
FROM node:lts-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Set the working directory inside the container
WORKDIR /app

# Enable Corepack and use the specified Yarn version
RUN corepack enable && corepack prepare yarn@stable --activate

# Copy necessary files from the build stage
COPY --from=build /app/package.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=build /app/.yarn ./.yarn
COPY --from=build /app/dist ./dist
COPY --from=build /app/nest-cli.json ./
COPY --from=build /app/tsconfig.json ./

# Install production dependencies only
RUN yarn install --immutable

# Switch to non-root user for security
USER node

# Expose the application port
EXPOSE 3030

# Start the application
CMD ["node", "dist/main.js"] 