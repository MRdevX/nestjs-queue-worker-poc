#!/bin/bash

echo "🧪 Testing Dynamic Database Seeder"
echo "=================================="

# Test 1: Default seeding
echo "📝 Test 1: Default seeding (3 workflows, 5 tasks per type, 10 customers)"
curl -X POST http://localhost:3030/seeder/seed \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 2: Light seeding for quick testing
echo "📝 Test 2: Light seeding (1 workflow, 2 tasks per type, 3 customers)"
curl -X POST http://localhost:3030/seeder/seed \
  -H "Content-Type: application/json" \
  -d '{"workflows": 1, "tasksPerType": 2, "customers": 3}' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 3: Heavy seeding for stress testing
echo "📝 Test 3: Heavy seeding (5 workflows, 10 tasks per type, 20 customers)"
curl -X POST http://localhost:3030/seeder/seed \
  -H "Content-Type: application/json" \
  -d '{"workflows": 5, "tasksPerType": 10, "customers": 20}' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

# Test 4: Reset with custom config
echo "📝 Test 4: Reset with custom config (2 workflows, 3 tasks per type, 5 customers)"
curl -X POST http://localhost:3030/seeder/reset \
  -H "Content-Type: application/json" \
  -d '{"workflows": 2, "tasksPerType": 3, "customers": 5}' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n\n"

echo "✅ Dynamic seeder tests completed!" 