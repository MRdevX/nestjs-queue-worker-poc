# Invoice Testing Quick Start Guide

## Prerequisites

1. **Start the application and dependencies:**

   ```bash
   # Start PostgreSQL, RabbitMQ, and Redis
   docker-compose up -d

   # Start the application
   npm run start:dev
   ```

2. **Verify the application is running:**
   ```bash
   curl http://localhost:3030/health
   ```

## Quick Test Scenarios

### 1. Basic Invoice Workflow Test

**Step 1: Start an invoice workflow**

```bash
curl -X POST http://localhost:3030/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

**Expected Response:**

```json
{
  "message": "Invoice workflow started",
  "taskId": "uuid-here",
  "workflowId": null
}
```

**Step 2: Check the created task**

```bash
curl http://localhost:3030/tasks/uuid-here
```

**Step 3: Monitor workflow status**

```bash
curl http://localhost:3030/invoice/status/customer-123
```

### 2. Scheduled Invoice Test

```bash
curl -X POST http://localhost:3030/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-456",
    "scheduledAt": "2024-12-25T10:00:00Z",
    "dateFrom": "2024-12-01",
    "dateTo": "2024-12-31"
  }'
```

### 3. Recurring Invoice Test

```bash
curl -X POST http://localhost:3030/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-789",
    "cronExpression": "0 0 * * *",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

### 4. Query Tasks Test

```bash
# Get all tasks for a customer
curl http://localhost:3030/invoice/tasks/customer-123

# Get tasks by status
curl http://localhost:3030/tasks?status=pending

# Get queue status
curl http://localhost:3030/queue-manager/status
```

## Using Postman Collection

1. **Import the collection:**
   - Open Postman
   - Import `resources/postman/Invoice-Testing.postman_collection.json`
   - Set environment variable `baseUrl` to `http://localhost:3030`

2. **Run the collection:**
   - Start with "Health Check" to verify the application is running
   - Use "Seed Database" to populate test data
   - Run "Invoice Workflow - Start" to test basic functionality
   - Use "Get Invoice Workflow Status" to monitor progress

## Running Automated Tests

### Unit Tests

```bash
npm run test src/app/invoice
```

### Integration Tests

```bash
npm run test:e2e src/app/invoice/__tests__/invoice.integration.spec.ts
```

### All Tests

```bash
npm run test
npm run test:e2e
```

## Monitoring and Debugging

### Check Application Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# View RabbitMQ logs
docker-compose logs -f rabbitmq
```

### Database Queries

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d queue_worker

# Check tasks
SELECT * FROM task_entity WHERE payload->>'customerId' = 'customer-123';

# Check task status distribution
SELECT status, COUNT(*) FROM task_entity GROUP BY status;
```

### Queue Monitoring

```bash
# Access RabbitMQ Management UI
open http://localhost:15672
# Username: guest, Password: guest
```

## Common Issues and Solutions

### Issue: Application won't start

**Solution:**

```bash
# Check if all services are running
docker-compose ps

# Restart all services
docker-compose down
docker-compose up -d
```

### Issue: Database connection failed

**Solution:**

```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Reset database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS queue_worker;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE queue_worker;"
```

### Issue: Tasks not processing

**Solution:**

```bash
# Check worker processes
docker-compose logs app | grep "worker"

# Check queue status
curl http://localhost:3030/queue-manager/status

# Restart the application
docker-compose restart app
```

### Issue: External API calls failing

**Solution:**

```bash
# Check if external services are mocked
curl https://mock-pdf-processor.com/generate
curl https://mock-email-service.com/send

# Update environment variables if needed
export PDF_PROCESSOR_URL=https://mock-pdf-processor.com/generate
export EMAIL_SERVICE_URL=https://mock-email-service.com/send
```

## Performance Testing

### Load Test

```bash
# Run concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3030/invoice/workflow/start \
    -H "Content-Type: application/json" \
    -d "{\"customerId\": \"customer-$i\", \"dateFrom\": \"2024-01-01\", \"dateTo\": \"2024-01-31\"}" &
done
wait
```

### Monitor Performance

```bash
# Check queue health
curl http://localhost:3030/queue-manager/status

# Monitor database performance
docker-compose exec postgres psql -U postgres -d queue_worker -c "SELECT COUNT(*) FROM task_entity;"
```

## Cleanup

### Clear Test Data

```bash
# Clear database
curl -X DELETE http://localhost:3030/seeder/clear

# Or reset everything
docker-compose down -v
docker-compose up -d
```

### Stop All Services

```bash
docker-compose down
```

## Next Steps

1. **Review the comprehensive documentation:** `INVOICE_TESTING_DOCUMENTATION.md`
2. **Run the integration tests:** `src/app/invoice/__tests__/invoice.integration.spec.ts`
3. **Use the Postman collection:** `resources/postman/Invoice-Testing.postman_collection.json`
4. **Explore the codebase:** Review the invoice module implementation
5. **Extend tests:** Add more specific test cases for your use cases

## Support

If you encounter issues:

1. Check the application logs
2. Verify all services are running
3. Review the troubleshooting section in the main documentation
4. Check the test output for specific error messages
