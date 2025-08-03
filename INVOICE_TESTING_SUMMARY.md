# Invoice Use Case Testing - Complete Setup

## 🎯 What We've Accomplished

I've created a comprehensive testing setup for the invoice use case that includes:

### 1. Enhanced Logging System

- **Added detailed logging** to `InvoiceWorkflowService` with emoji-based identifiers
- **Added comprehensive logging** to `InvoiceService` for all operations
- **Log patterns** make it easy to track workflow progression:
  - 🚀 Workflow initiation
  - 🔄 Task transitions
  - ✅ Successful operations
  - ❌ Errors and failures
  - 📤 Queue operations
  - 💥 Task failures
  - 🛠️ Compensation tasks

### 2. Testing Documentation

- **`INVOICE_TESTING_GUIDE.md`**: Complete step-by-step testing guide
- **`INVOICE_TESTING_QUICK_REFERENCE.md`**: Quick reference for essential commands
- **`INVOICE_TESTING_SUMMARY.md`**: This summary document

### 3. Automated Testing Script

- **`test-invoice-workflow.sh`**: Automated script that runs all test scenarios
- **Comprehensive coverage** of all invoice workflow functionalities
- **Error scenario testing** included

## 🚀 How to Test the Invoice Use Case

### Quick Start (Recommended)

```bash
# 1. Start the application
docker-compose up -d

# 2. Run the automated test script
./test-invoice-workflow.sh

# 3. Monitor the results
```

### Manual Testing (Step by Step)

#### Phase 1: Basic Setup

1. **Start services**: `docker-compose up -d`
2. **Health check**: `curl http://localhost:3030/api/health`
3. **Queue status**: `curl http://localhost:3030/api/queue/status`

#### Phase 2: Immediate Invoice Workflow

1. **Start workflow**:

   ```bash
   curl -X POST http://localhost:3030/api/invoice/workflow/start \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": "customer-123",
       "dateFrom": "2024-01-01",
       "dateTo": "2024-01-31",
       "workflowId": "workflow-123"
     }'
   ```

2. **Monitor progress**:
   - Check application logs for workflow progression
   - Monitor RabbitMQ at http://localhost:15672
   - Check database for task records

3. **Verify completion**:
   ```bash
   curl http://localhost:3030/api/invoice/status/customer-123
   ```

#### Phase 3: Scheduled and Recurring Workflows

- Test scheduled workflows with future dates
- Test recurring workflows with cron expressions
- Monitor scheduled task execution

#### Phase 4: Error Scenarios

- Test invalid inputs
- Test task failures
- Verify compensation mechanisms

## 🔍 What to Monitor

### 1. Application Logs

The enhanced logging system provides detailed visibility:

```
🚀 [START_INVOICE_WORKFLOW] Starting invoice workflow for customer: customer-123
✅ [START_INVOICE_WORKFLOW] FETCH_ORDERS task created with ID: abc-123
📤 [START_INVOICE_WORKFLOW] FETCH_ORDERS task published to queue: abc-123
🔄 [FETCH_ORDERS_COMPLETION] Starting to handle fetch orders completion for task: abc-123
📦 [FETCH_ORDERS_COMPLETION] Processing 2 orders for customer: customer-123
✅ [FETCH_ORDERS_COMPLETION] CREATE_INVOICE task created with ID: def-456
🔄 [CREATE_INVOICE_COMPLETION] Starting to handle create invoice completion for task: def-456
🧾 [CREATE_INVOICE_COMPLETION] Invoice created successfully - ID: invoice-123
✅ [CREATE_INVOICE_COMPLETION] GENERATE_PDF task created with ID: ghi-789
🔄 [GENERATE_PDF_COMPLETION] Starting to handle generate PDF completion for task: ghi-789
📄 [GENERATE_PDF_COMPLETION] PDF generated successfully - URL: https://...
✅ [GENERATE_PDF_COMPLETION] SEND_EMAIL task created with ID: jkl-012
🔄 [SEND_EMAIL_COMPLETION] Starting to handle send email completion for task: jkl-012
📧 [SEND_EMAIL_COMPLETION] Email sent successfully to customer: customer-123
🎉 [SEND_EMAIL_COMPLETION] INVOICE WORKFLOW COMPLETED SUCCESSFULLY for customer: customer-123
```

### 2. Database Monitoring

Key queries to monitor task progression:

```sql
-- Check all tasks for a customer
SELECT id, type, status, created_at, updated_at
FROM tasks
WHERE payload->>'customerId' = 'customer-123'
ORDER BY created_at;

-- Check task details with payload
SELECT id, type, status, payload, error, retries
FROM tasks
WHERE id = 'task-id-here';

-- Monitor scheduled tasks
SELECT id, type, status, scheduled_at
FROM tasks
WHERE scheduled_at IS NOT NULL;
```

### 3. RabbitMQ Monitoring

- **URL**: http://localhost:15672
- **Credentials**: guest/guest
- **Monitor**: Queue depth, message rates, consumer status

### 4. API Endpoints

- **Health**: `GET /api/health`
- **Queue Status**: `GET /api/queue/status`
- **Workflow Status**: `GET /api/invoice/status/{customerId}`
- **Customer Tasks**: `GET /api/invoice/tasks/{customerId}`
- **Queue Manager**: `GET /api/queue-manager/status`

## 📊 Expected Workflow Flow

The complete invoice workflow follows this pattern:

1. **FETCH_ORDERS** (fetch_orders)
   - Status: `pending` → `processing` → `completed`
   - Fetches orders from Ninox database
   - Filters for delivered, non-invoiced orders

2. **CREATE_INVOICE** (create_invoice)
   - Status: `pending` → `processing` → `completed`
   - Creates invoice from orders
   - Calculates totals and tax

3. **GENERATE_PDF** (generate_pdf)
   - Status: `pending` → `processing` → `completed`
   - Generates PDF from invoice data
   - Stores PDF in cloud storage

4. **SEND_EMAIL** (send_email)
   - Status: `pending` → `processing` → `completed`
   - Sends email with invoice PDF
   - Notifies customer

## 🐛 Error Handling and Compensation

The system includes robust error handling:

- **Task Failures**: Automatically create compensation tasks
- **Retry Logic**: Failed tasks can be retried
- **Compensation**: Rollback operations for failed workflows
- **Monitoring**: Comprehensive logging of all failures

## 🎯 Success Criteria

A successful test run should show:

✅ **All 4 workflow tasks completed** with status `completed`
✅ **No failed tasks** in the queue
✅ **Clean application logs** with no errors
✅ **Database consistency** between task records and workflow status
✅ **RabbitMQ queue healthy** with no stuck messages

## 📝 Key Files Created/Modified

### Enhanced Files

- `src/app/invoice/invoice-workflow.service.ts` - Added comprehensive logging
- `src/app/invoice/invoice.service.ts` - Added detailed operation logging

### New Files

- `INVOICE_TESTING_GUIDE.md` - Complete testing guide
- `INVOICE_TESTING_QUICK_REFERENCE.md` - Quick reference
- `INVOICE_TESTING_SUMMARY.md` - This summary
- `test-invoice-workflow.sh` - Automated testing script

## 🚀 Next Steps

1. **Run the automated test script** to verify everything works
2. **Monitor the logs** to understand the workflow flow
3. **Test error scenarios** to verify error handling
4. **Scale testing** with multiple concurrent workflows
5. **Integration testing** with real external services

## 💡 Tips for Effective Testing

1. **Start with the automated script** to get familiar with the flow
2. **Monitor logs in real-time** to see the workflow progression
3. **Use the quick reference** for common commands
4. **Check all monitoring points** (logs, database, RabbitMQ)
5. **Test error scenarios** to understand failure handling
6. **Use the Postman collection** for more complex testing scenarios

This setup provides complete visibility into the invoice workflow system and makes it easy to test, debug, and understand how everything works together.
