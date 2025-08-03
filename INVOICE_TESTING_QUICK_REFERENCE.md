# Invoice Testing Quick Reference

## 🚀 Quick Start

```bash
# 1. Start the application
docker-compose up -d

# 2. Run the automated test script
./test-invoice-workflow.sh

# 3. Or run individual commands below
```

## 📋 Essential Commands

### Health Check

```bash
curl http://localhost:3030/api/health
curl http://localhost:3030/api/queue/status
```

### Start Invoice Workflow

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

### Check Workflow Status

```bash
curl http://localhost:3030/api/invoice/status/customer-123
curl http://localhost:3030/api/invoice/tasks/customer-123
```

### Scheduled Workflows

```bash
# Scheduled invoice
curl -X POST http://localhost:3030/api/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-456",
    "scheduledAt": "2024-01-15T15:00:00Z",
    "workflowId": "scheduled-workflow-123"
  }'

# Recurring invoice
curl -X POST http://localhost:3030/api/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-789",
    "cronExpression": "0 0 * * *",
    "workflowId": "recurring-workflow-123"
  }'
```

## 🔍 Monitoring Points

### 1. Application Logs

Look for these log patterns:

- `🚀 [START_INVOICE_WORKFLOW]` - Workflow started
- `🔄 [FETCH_ORDERS_COMPLETION]` - Orders fetched
- `🔄 [CREATE_INVOICE_COMPLETION]` - Invoice created
- `🔄 [GENERATE_PDF_COMPLETION]` - PDF generated
- `🔄 [SEND_EMAIL_COMPLETION]` - Email sent
- `💥 [TASK_FAILURE]` - Task failed
- `🛠️ [TASK_FAILURE]` - Compensation created

### 2. Database Queries

```sql
-- Connect to PostgreSQL: localhost:55000, user: postgres, password: postgrespw, db: queue_worker

-- Check all tasks for a customer
SELECT id, type, status, created_at, updated_at
FROM tasks
WHERE payload->>'customerId' = 'customer-123'
ORDER BY created_at;

-- Check task details
SELECT id, type, status, payload, error, retries
FROM tasks
WHERE id = 'task-id-here';

-- Check scheduled tasks
SELECT id, type, status, scheduled_at
FROM tasks
WHERE scheduled_at IS NOT NULL;
```

### 3. RabbitMQ Management

- **URL**: http://localhost:15672
- **Credentials**: guest/guest
- **Check**: Queue depth, message rates, consumer status

### 4. Queue Management API

```bash
curl http://localhost:3030/api/queue-manager/status
curl http://localhost:3030/api/queue-manager/failed-count
curl http://localhost:3030/api/queue-manager/pending-count
```

## 🐛 Debugging Commands

### Check Task Details

```bash
curl http://localhost:3030/api/tasks/{task-id}
```

### Retry Failed Task

```bash
curl -X POST http://localhost:3030/api/tasks/{task-id}/retry
```

### Create Compensation Task

```bash
curl -X POST http://localhost:3030/api/tasks/{task-id}/compensate
```

### Test Error Scenarios

```bash
# Invalid customer ID
curl -X POST http://localhost:3030/api/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{"customerId": ""}'

# Invalid date
curl -X POST http://localhost:3030/api/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{"customerId": "test", "scheduledAt": "invalid-date"}'
```

## 📊 Expected Workflow Flow

1. **FETCH_ORDERS** → `pending` → `processing` → `completed`
2. **CREATE_INVOICE** → `pending` → `processing` → `completed`
3. **GENERATE_PDF** → `pending` → `processing` → `completed`
4. **SEND_EMAIL** → `pending` → `processing` → `completed`

## 🔧 Troubleshooting

### Tasks Not Processing

- Check if workers are running
- Verify RabbitMQ connection
- Check application logs for errors

### Database Issues

- Verify PostgreSQL is running on port 55000
- Check connection credentials
- Ensure database exists

### RabbitMQ Issues

- Verify RabbitMQ is running on port 5672
- Check management UI at port 15672
- Verify queue exists and has consumers

## 📝 Key URLs

- **Application API**: http://localhost:3030
- **RabbitMQ Management**: http://localhost:15672
- **PostgreSQL**: localhost:55000
- **Health Check**: http://localhost:3030/api/health

## 🎯 Success Indicators

✅ **Workflow Complete**: All 4 tasks in `completed` status
✅ **Queue Healthy**: No pending tasks, no failed tasks
✅ **Logs Clean**: No error messages, all steps logged
✅ **Database Consistent**: Task records match workflow status
