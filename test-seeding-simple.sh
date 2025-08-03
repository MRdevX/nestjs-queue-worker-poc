#!/bin/bash

# Simple test script for database seeding
BASE_URL="http://localhost:3030/api"

echo "🚀 Testing Database Seeding"
echo "=========================="

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq '.' 2>/dev/null || echo "Health check failed"

# Test 2: Seed database
echo ""
echo "2. Seeding database..."
curl -s -X POST "$BASE_URL/seeder/seed" | jq '.' 2>/dev/null || echo "Seeding failed"

# Test 3: Check seeded data
echo ""
echo "3. Checking seeded tasks..."
curl -s "$BASE_URL/tasks" | jq '.' 2>/dev/null || echo "Failed to get tasks"

# Test 4: Check queue status
echo ""
echo "4. Checking queue status..."
curl -s "$BASE_URL/queue/status" | jq '.' 2>/dev/null || echo "Failed to get queue status"

echo ""
echo "✅ Testing completed!" 