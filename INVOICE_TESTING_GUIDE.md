# Invoice Use Case Testing Guide

This guide will walk you through testing all invoice workflow functionalities manually, step by step.

## Prerequisites

1. **Start the application and dependencies:**

   ```bash
   # Start PostgreSQL, RabbitMQ, and the application
   docker-compose up -d

   # Or start in development mode
   ./start-dev.sh
   ```

2. **Verify services are running:**
   - PostgreSQL: `localhost:55000`
   - RabbitMQ Management UI: `http://localhost:15672` (guest/guest)
   - Application API: `http://localhost:3030`

## Testing Tools

### 1. API Testing

- **Postman Collection**: Use the provided `Queue-Worker-POC.postman_collection.json`
- **cURL**: For command-line testing
- **Browser**: For GET requests

### 2. Monitoring Tools

- **RabbitMQ Management UI**: `http://localhost:15672`
- **PostgreSQL**: Use any PostgreSQL client (pgAdmin, DBeaver, etc.)
- **Application Logs**: Check console output for detailed logging

## Step-by-Step Testing Guide

### Phase 1: Basic Health Check

#### 1.1 Verify Application Health

```bash
curl http://localhost:3030/api/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

#### 1.2 Check Queue Status

```bash
curl http://localhost:3030/api/queue/status
```

**Expected Response:**

```json
{
  "pending": 0,
  "processing": 0,
  "completed": 0,
  "failed": 0,
  "total": 0,
  "isHealthy": true
}
```

### Phase 2: Immediate Invoice Workflow

#### 2.1 Start Invoice Workflow

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

**Expected Response:**

```json
{
  "message": "Invoice workflow started",
  "taskId": "uuid-here",
  "workflowId": "workflow-123"
}
```

**What to Check:**

1. **Application Logs**: Look for logs starting with `🚀 [START_INVOICE_WORKFLOW]`
2. **Database**: Check `tasks` table for new FETCH_ORDERS task
3. **RabbitMQ**: Check queue for new message

#### 2.2 Monitor Task Processing

**Check Database:**

```sql
-- Connect to PostgreSQL (localhost:55000, user: postgres, password: postgrespw, db: queue_worker)
SELECT id, type, status, payload, created_at, updated_at
FROM tasks
WHERE payload->>'customerId' = 'customer-123'
ORDER BY created_at;
```

**Check RabbitMQ:**

1. Go to `http://localhost:15672`
2. Login with `guest/guest`
3. Check the `worker_queue` for messages
4. Monitor message consumption

**Check Application Logs:**
Look for worker processing logs:

- `🔄 [FETCH_ORDERS_COMPLETION]` - When fetch orders completes
- `🔄 [CREATE_INVOICE_COMPLETION]` - When invoice creation completes
- `🔄 [GENERATE_PDF_COMPLETION]` - When PDF generation completes
- `🔄 [SEND_EMAIL_COMPLETION]` - When email sending completes

#### 2.3 Check Workflow Status

```bash
curl http://localhost:3030/api/invoice/status/customer-123
```

**Expected Response:**

```json
{
  "customerId": "customer-123",
  "totalTasks": 4,
  "completedTasks": 4,
  "failedTasks": 0,
  "pendingTasks": 0,
  "processingTasks": 0,
  "workflows": {
    "workflow-123": {
      "totalTasks": 4,
      "completedTasks": 4,
      "failedTasks": 0,
      "isComplete": true
    }
  }
}
```

#### 2.4 Get Customer Tasks

```bash
curl http://localhost:3030/api/invoice/tasks/customer-123
```

**Expected Response:**

```json
{
  "customerId": "customer-123",
  "tasks": [
    {
      "id": "task-id-1",
      "type": "fetch_orders",
      "status": "completed",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "completedAt": "2024-01-15T10:01:00.000Z"
    },
    {
      "id": "task-id-2",
      "type": "create_invoice",
      "status": "completed",
      "createdAt": "2024-01-15T10:01:00.000Z",
      "completedAt": "2024-01-15T10:02:00.000Z"
    }
    // ... more tasks
  ]
}
```

### Phase 3: Scheduled Invoice Workflow

#### 3.1 Create Scheduled Invoice Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-456",
    "scheduledAt": "2024-01-15T15:00:00Z",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "workflowId": "scheduled-workflow-123"
  }'
```

**Expected Response:**

```json
{
  "message": "Scheduled invoice workflow created",
  "taskId": "uuid-here",
  "scheduledAt": "2024-01-15T15:00:00.000Z",
  "workflowId": "scheduled-workflow-123"
}
```

**What to Check:**

1. **Database**: Check `tasks` table for task with `scheduled_at` field
2. **Application Logs**: Look for `⏰ [SCHEDULED_INVOICE_WORKFLOW]` logs

#### 3.2 Monitor Scheduled Task Execution

```sql
-- Check scheduled tasks
SELECT id, type, status, scheduled_at, payload
FROM tasks
WHERE scheduled_at IS NOT NULL
ORDER BY scheduled_at;
```

### Phase 4: Recurring Invoice Workflow

#### 4.1 Create Recurring Invoice Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-789",
    "cronExpression": "0 0 * * *",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31",
    "workflowId": "recurring-workflow-123"
  }'
```

**Expected Response:**

```json
{
  "message": "Recurring invoice workflow created",
  "taskId": "uuid-here",
  "cronExpression": "0 0 * * *",
  "workflowId": "recurring-workflow-123"
}
```

**What to Check:**

1. **Database**: Check for recurring task configuration
2. **Application Logs**: Look for `🔄 [RECURRING_INVOICE_WORKFLOW]` logs

### Phase 5: Scheduled Email Workflow

#### 5.1 Create Scheduled Email Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/email/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "invoiceId": "invoice-123",
    "scheduledAt": "2024-01-15T16:00:00Z",
    "workflowId": "email-workflow-123"
  }'
```

**Expected Response:**

```json
{
  "message": "Scheduled email workflow created",
  "taskId": "uuid-here",
  "scheduledAt": "2024-01-15T16:00:00.000Z",
  "workflowId": "email-workflow-123"
}
```

### Phase 6: Error Scenarios

#### 6.1 Test Invalid Customer ID

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

**Expected Response:** 400 Bad Request

#### 6.2 Test Invalid Date Format

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "scheduledAt": "invalid-date",
    "workflowId": "test-workflow"
  }'
```

**Expected Response:** 400 Bad Request

#### 6.3 Test Task Failure and Compensation

1. Start a workflow
2. Manually fail a task in the database:
   ```sql
   UPDATE tasks
   SET status = 'failed', error = 'Simulated failure'
   WHERE id = 'task-id-here';
   ```
3. Check for compensation task creation
4. Monitor logs for `💥 [TASK_FAILURE]` messages

### Phase 7: Queue Management

#### 7.1 Check Queue Manager Status

```bash
curl http://localhost:3030/api/queue-manager/status
```

#### 7.2 Check Failed Tasks Count

```bash
curl http://localhost:3030/api/queue-manager/failed-count
```

#### 7.3 Check Pending Tasks Count

```bash
curl http://localhost:3030/api/queue-manager/pending-count
```

#### 7.4 Check if Queue is Overloaded

```bash
curl http://localhost:3030/api/queue-manager/overloaded
```

### Phase 8: Task Management

#### 8.1 Get Task by ID

```bash
curl http://localhost:3030/api/tasks/{task-id}
```

#### 8.2 Retry Failed Task

```bash
curl -X POST http://localhost:3030/api/tasks/{task-id}/retry
```

#### 8.3 Create Compensation Task

```bash
curl -X POST http://localhost:3030/api/tasks/{task-id}/compensate
```

## Monitoring and Debugging

### 1. Application Logs

The application now includes comprehensive logging with emojis for easy identification:

- 🚀 Workflow start operations
- 🔄 Task processing and transitions
- ✅ Successful operations
- ❌ Errors and failures
- 📤 Queue publishing
- 📋 Task details
- 👤 Customer information
- 🧾 Invoice details
- 📄 PDF operations
- 📧 Email operations
- 💥 Task failures
- 🛠️ Compensation tasks

### 2. Database Monitoring

Key tables to monitor:

- `tasks`: All task records
- `task_logs`: Detailed task execution logs
- `workflows`: Workflow definitions

### 3. RabbitMQ Monitoring

- Queue depth and message rates
- Consumer status
- Message acknowledgments
- Dead letter queues

### 4. Performance Monitoring

- Task processing times
- Queue latency
- Database query performance
- Memory usage

## Common Issues and Solutions

### 1. Tasks Not Processing

**Symptoms:** Tasks stuck in PENDING status
**Solutions:**

- Check if workers are running
- Verify RabbitMQ connection
- Check application logs for errors

### 2. Database Connection Issues

**Symptoms:** Database connection errors in logs
**Solutions:**

- Verify PostgreSQL is running
- Check connection credentials
- Ensure database exists

### 3. RabbitMQ Connection Issues

**Symptoms:** Message publishing failures
**Solutions:**

- Verify RabbitMQ is running
- Check connection credentials
- Ensure queue exists

### 4. Task Failures

**Symptoms:** Tasks in FAILED status
**Solutions:**

- Check task logs for error details
- Verify external service availability
- Review task payload data

## Advanced Testing Scenarios

### 1. High Load Testing

- Create multiple concurrent workflows
- Monitor queue performance
- Check system resource usage

### 2. Network Failure Testing

- Simulate network interruptions
- Test retry mechanisms
- Verify compensation workflows

### 3. Data Validation Testing

- Test with invalid data formats
- Verify error handling
- Check data sanitization

### 4. Integration Testing

- Test with real external services
- Verify end-to-end workflows
- Check data consistency

## Postman Collection Usage

1. **Import the collection** from `resources/postman/Queue-Worker-POC.postman_collection.json`
2. **Import the environment** from `resources/postman/Queue-Worker-POC.postman_environment.json`
3. **Select the environment** in Postman
4. **Use the pre-configured requests** for each testing phase
5. **Run the collection** for automated testing

## Conclusion

This testing guide covers all major aspects of the invoice workflow system. By following these steps, you can:

1. Verify all functionality works correctly
2. Understand the system's behavior under different conditions
3. Debug issues effectively
4. Monitor system performance
5. Ensure data consistency

Remember to check the application logs, database, and RabbitMQ management UI throughout the testing process to get a complete picture of the system's operation.
