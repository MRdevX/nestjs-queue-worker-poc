#!/bin/bash

# Development startup script for queue-worker-poc

echo "🚀 Starting Queue Worker POC in development mode..."

# Clean up any existing containers and volumes
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.dev.yml down -v

# Build and start the development environment
echo "🔨 Building and starting development environment..."
docker compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "📊 Services available at:"
echo "   - App: http://localhost:3030"
echo "   - RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo "   - PostgreSQL: localhost:55001" 