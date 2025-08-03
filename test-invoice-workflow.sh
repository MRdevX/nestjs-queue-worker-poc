#!/bin/bash

# Invoice Workflow Testing Script
# This script provides all the commands needed to test the invoice workflow

BASE_URL="http://localhost:3030/api"
CUSTOMER_ID="customer-123"
WORKFLOW_ID="workflow-123"

echo "🧪 Invoice Workflow Testing Script"
echo "=================================="
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo "📋 $1"
    echo "----------------------------------------"
}

# Function to execute curl command and show response
execute_request() {
    echo "🔗 $1"
    echo "Command: $2"
    echo "Response:"
    eval "$2"
    echo ""
}

# Phase 1: Health Check
print_section "Phase 1: Health Check"

execute_request "Health Check" "curl -s $BASE_URL/health | jq ."
execute_request "Queue Status" "curl -s $BASE_URL/queue/status | jq ."

# Phase 2: Immediate Invoice Workflow
print_section "Phase 2: Immediate Invoice Workflow"

echo "🚀 Starting invoice workflow for customer: $CUSTOMER_ID"
WORKFLOW_RESPONSE=$(curl -s -X POST $BASE_URL/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"dateFrom\": \"2024-01-01\",
    \"dateTo\": \"2024-01-31\",
    \"workflowId\": \"$WORKFLOW_ID\"
  }")

echo "Workflow Response:"
echo "$WORKFLOW_RESPONSE" | jq .

# Extract task ID from response
TASK_ID=$(echo "$WORKFLOW_RESPONSE" | jq -r '.taskId')
echo "📝 Task ID: $TASK_ID"

echo ""
echo "⏳ Waiting 5 seconds for task processing..."
sleep 5

execute_request "Workflow Status" "curl -s $BASE_URL/invoice/status/$CUSTOMER_ID | jq ."
execute_request "Customer Tasks" "curl -s $BASE_URL/invoice/tasks/$CUSTOMER_ID | jq ."

# Phase 3: Scheduled Invoice Workflow
print_section "Phase 3: Scheduled Invoice Workflow"

SCHEDULED_TIME=$(date -d "+1 hour" -u +"%Y-%m-%dT%H:%M:%SZ")
echo "⏰ Creating scheduled workflow for: $SCHEDULED_TIME"

SCHEDULED_RESPONSE=$(curl -s -X POST $BASE_URL/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"customer-456\",
    \"scheduledAt\": \"$SCHEDULED_TIME\",
    \"dateFrom\": \"2024-01-01\",
    \"dateTo\": \"2024-01-31\",
    \"workflowId\": \"scheduled-workflow-123\"
  }")

echo "Scheduled Workflow Response:"
echo "$SCHEDULED_RESPONSE" | jq .

# Phase 4: Recurring Invoice Workflow
print_section "Phase 4: Recurring Invoice Workflow"

RECURRING_RESPONSE=$(curl -s -X POST $BASE_URL/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-789",
    "cronExpression": "0 0 * * *",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "workflowId": "recurring-workflow-123"
  }')

echo "Recurring Workflow Response:"
echo "$RECURRING_RESPONSE" | jq .

# Phase 5: Scheduled Email Workflow
print_section "Phase 5: Scheduled Email Workflow"

EMAIL_TIME=$(date -d "+2 hours" -u +"%Y-%m-%dT%H:%M:%SZ")
echo "📧 Creating scheduled email for: $EMAIL_TIME"

EMAIL_RESPONSE=$(curl -s -X POST $BASE_URL/invoice/email/scheduled \
  -H "Content-Type: application/json" \
  -d "{
    \"customerId\": \"$CUSTOMER_ID\",
    \"invoiceId\": \"invoice-123\",
    \"scheduledAt\": \"$EMAIL_TIME\",
    \"workflowId\": \"email-workflow-123\"
  }")

echo "Scheduled Email Response:"
echo "$EMAIL_RESPONSE" | jq .

# Phase 6: Error Scenarios
print_section "Phase 6: Error Scenarios"

echo "❌ Testing invalid customer ID..."
curl -s -X POST $BASE_URL/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }' | jq .

echo ""
echo "❌ Testing invalid date format..."
curl -s -X POST $BASE_URL/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "scheduledAt": "invalid-date",
    "workflowId": "test-workflow"
  }' | jq .

# Phase 7: Queue Management
print_section "Phase 7: Queue Management"

execute_request "Queue Manager Status" "curl -s $BASE_URL/queue-manager/status | jq ."
execute_request "Failed Tasks Count" "curl -s $BASE_URL/queue-manager/failed-count | jq ."
execute_request "Pending Tasks Count" "curl -s $BASE_URL/queue-manager/pending-count | jq ."
execute_request "Queue Overloaded Check" "curl -s $BASE_URL/queue-manager/overloaded | jq ."

# Phase 8: Task Management
print_section "Phase 8: Task Management"

if [ ! -z "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
    execute_request "Get Task by ID" "curl -s $BASE_URL/tasks/$TASK_ID | jq ."
else
    echo "⚠️ No task ID available for task management testing"
fi

echo ""
echo "🎯 Testing Complete!"
echo ""
echo "📊 Next Steps:"
echo "1. Check application logs for detailed workflow execution"
echo "2. Monitor RabbitMQ at http://localhost:15672 (guest/guest)"
echo "3. Check PostgreSQL database for task records"
echo "4. Review the INVOICE_TESTING_GUIDE.md for detailed explanations"
echo ""
echo "🔍 Monitoring URLs:"
echo "- Application: http://localhost:3030"
echo "- RabbitMQ Management: http://localhost:15672"
echo "- PostgreSQL: localhost:55000"
echo ""
echo "📝 Key Log Patterns to Watch:"
echo "- 🚀 [START_INVOICE_WORKFLOW] - Workflow initiation"
echo "- 🔄 [FETCH_ORDERS_COMPLETION] - Orders fetched"
echo "- 🔄 [CREATE_INVOICE_COMPLETION] - Invoice created"
echo "- 🔄 [GENERATE_PDF_COMPLETION] - PDF generated"
echo "- 🔄 [SEND_EMAIL_COMPLETION] - Email sent"
echo "- 💥 [TASK_FAILURE] - Task failures"
echo "- 🛠️ [TASK_FAILURE] - Compensation tasks" 