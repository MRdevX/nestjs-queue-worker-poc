#!/bin/bash

# Production startup script for queue-worker-poc

echo "🚀 Starting Queue Worker POC in production mode..."

# Clean up any existing containers and volumes
echo "🧹 Cleaning up existing containers..."
docker compose down -v

# Build and start the production environment
echo "🔨 Building and starting production environment..."
docker compose up --build -d

echo "✅ Production environment started!"
echo "📊 Services available at:"
echo "   - App: http://localhost:3030"
echo "   - RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo "   - PostgreSQL: localhost:55000"

# Show logs
echo "📋 Showing logs..."
docker compose logs -f 