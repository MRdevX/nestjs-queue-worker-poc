#!/bin/bash

# Invoice Workflow Testing Script with Database Seeding
# This script will seed the database and test the invoice workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3030/api"
CUSTOMER_ID="customer-123"
CUSTOMER_ID_2="customer-456"
CUSTOMER_ID_FAILED="customer-failed"
CUSTOMER_ID_PENDING="customer-pending"

echo -e "${BLUE}🚀 Invoice Workflow Testing Script with Database Seeding${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=10
    local attempt=1

    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_status "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name is not ready after $max_attempts attempts"
    return 1
}

# Function to make API calls
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    print_info "$description"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint")
    fi
    
    # Extract status code and body (compatible with both macOS and Linux)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_status "Request successful (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        print_error "Request failed (HTTP $http_code)"
        echo "$body"
    fi
    
    echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed. Installing JSON responses will not be formatted."
    print_info "Install jq with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
fi

# Wait for application to be ready
wait_for_service "Application" "$BASE_URL/health"

echo ""
print_info "Phase 1: Database Seeding"
echo "=============================="

# Seed the database
make_request "POST" "/seeder/seed" "" "Seeding database with initial data"

# Verify seeding worked by checking queue status
make_request "GET" "/queue-manager/status" "" "Checking queue status after seeding"

echo ""
print_info "Phase 2: Basic Health Checks"
echo "=================================="

# Health check
make_request "GET" "/health" "" "Checking application health"

# Queue status
make_request "GET" "/queue-manager/status" "" "Checking queue status"

echo ""
print_info "Phase 3: Invoice Workflow Testing"
echo "======================================"

# Test 1: Start invoice workflow for customer-123
make_request "POST" "/invoice/workflow/start" "{
  \"customerId\": \"$CUSTOMER_ID\",
  \"dateFrom\": \"2024-01-01\",
  \"dateTo\": \"2024-01-31\",
  \"workflowId\": \"workflow-test-1\"
}" "Starting invoice workflow for $CUSTOMER_ID"

# Wait a moment for processing
sleep 3

# Check workflow status
make_request "GET" "/invoice/status/$CUSTOMER_ID" "" "Checking workflow status for $CUSTOMER_ID"

# Get customer tasks
make_request "GET" "/invoice/tasks/$CUSTOMER_ID" "" "Getting tasks for $CUSTOMER_ID"

echo ""
print_info "Phase 4: Scheduled Workflow Testing"
echo "========================================"

# Test 2: Create scheduled invoice workflow
scheduled_time=$(date -u -d '+2 minutes' '+%Y-%m-%dT%H:%M:%SZ')
make_request "POST" "/invoice/workflow/scheduled" "{
  \"customerId\": \"$CUSTOMER_ID_2\",
  \"scheduledAt\": \"$scheduled_time\",
  \"dateFrom\": \"2024-01-01\",
  \"dateTo\": \"2024-01-31\",
  \"workflowId\": \"scheduled-workflow-test\"
}" "Creating scheduled invoice workflow for $CUSTOMER_ID_2"

echo ""
print_info "Phase 5: Recurring Workflow Testing"
echo "========================================"

# Test 3: Create recurring invoice workflow
make_request "POST" "/invoice/workflow/recurring" "{
  \"customerId\": \"$CUSTOMER_ID_2\",
  \"cronExpression\": \"0 */2 * * *\",
  \"dateFrom\": \"2024-01-01\",
  \"dateTo\": \"2024-01-31\",
  \"workflowId\": \"recurring-workflow-test\"
}" "Creating recurring invoice workflow for $CUSTOMER_ID_2"

echo ""
print_info "Phase 6: Task Management Testing"
echo "====================================="

# Get queue manager status
make_request "GET" "/queue-manager/status" "" "Getting queue manager status"

# Get failed tasks count
make_request "GET" "/queue-manager/failed-count" "" "Getting failed tasks count"

# Get pending tasks count
make_request "GET" "/queue-manager/pending-count" "" "Getting pending tasks count"

echo ""
print_info "Phase 7: Error Scenario Testing"
echo "===================================="

# Test with invalid customer ID
make_request "POST" "/invoice/workflow/start" "{
  \"customerId\": \"\",
  \"dateFrom\": \"2024-01-01\",
  \"dateTo\": \"2024-01-31\"
}" "Testing with invalid customer ID (should fail)"

# Test with invalid date format
make_request "POST" "/invoice/workflow/scheduled" "{
  \"customerId\": \"$CUSTOMER_ID\",
  \"scheduledAt\": \"invalid-date\",
  \"workflowId\": \"test-workflow\"
}" "Testing with invalid date format (should fail)"

echo ""
print_info "Phase 8: Database Verification"
echo "==================================="

# Check queue status
make_request "GET" "/queue-manager/status" "" "Final queue status"

# Check specific customer tasks
make_request "GET" "/invoice/tasks/$CUSTOMER_ID" "" "Final state - tasks for $CUSTOMER_ID"

echo ""
print_info "Phase 9: Cleanup Options"
echo "============================="

print_info "To clear the database, run:"
echo "curl -X DELETE $BASE_URL/seeder/clear"

print_info "To reset the database (clear + seed), run:"
echo "curl -X POST $BASE_URL/seeder/reset"

echo ""
print_status "🎉 Invoice workflow testing completed!"
print_info "Check the application logs for detailed processing information"
print_info "Monitor RabbitMQ at: http://localhost:15672 (guest/guest)"
print_info "Check PostgreSQL at: localhost:55000 (postgres/postgrespw)" 