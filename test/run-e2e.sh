#!/bin/bash

# E2E Test Runner Script for Queue Worker System
# This script helps set up the environment and run e2e tests

set -e

echo "🚀 Starting E2E Tests for Queue Worker System"
echo "=============================================="

# Check if required services are running
echo "📋 Checking prerequisites..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   You can start it with: brew services start postgresql (macOS) or sudo systemctl start postgresql (Linux)"
    exit 1
fi
echo "✅ PostgreSQL is running"

# Check if RabbitMQ is running
if ! curl -s http://localhost:15672 > /dev/null 2>&1; then
    echo "❌ RabbitMQ is not running. Please start RabbitMQ first."
    echo "   You can start it with: brew services start rabbitmq (macOS) or sudo systemctl start rabbitmq-server (Linux)"
    exit 1
fi
echo "✅ RabbitMQ is running"

# Set test environment variables
export NODE_ENV=test
export DB_SYNCHRONIZE=true
export RABBITMQ_QUEUE_NAME=test_queue

echo "🔧 Environment configured for testing"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the e2e tests
echo "🧪 Running E2E tests..."
echo ""

# Check if specific test pattern is provided
if [ -n "$1" ]; then
    echo "Running tests matching pattern: $1"
    npm run test:e2e -- --testNamePattern="$1"
else
    echo "Running all E2E tests"
    npm run test:e2e
fi

echo ""
echo "✅ E2E tests completed!"

# Optional: Show test coverage
if [ "$2" = "--coverage" ]; then
    echo ""
    echo "📊 Generating coverage report..."
    npm run test:e2e -- --coverage
fi

echo ""
echo "🎉 All done! Check the test results above." 