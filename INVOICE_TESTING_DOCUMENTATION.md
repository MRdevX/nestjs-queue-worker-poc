# Invoice Usecase Testing Documentation

## Overview

The Invoice usecase implements a complete invoice generation workflow that processes customer orders, creates invoices, generates PDFs, and sends emails. This document provides comprehensive testing strategies and examples for all components of the invoice system.

## Architecture Overview

```
Invoice Workflow:
1. FETCH_ORDERS → 2. CREATE_INVOICE → 3. GENERATE_PDF → 4. SEND_EMAIL
```

### Components

- **InvoiceController**: REST API endpoints
- **InvoiceService**: Business logic and workflow coordination
- **InvoiceCoordinatorService**: Task completion/failure handling
- **TaskProcessorService**: Actual task execution
- **Workflow Integration**: Orchestrates the entire process

## API Endpoints

### 1. Start Invoice Workflow

```http
POST /invoice/workflow/start
Content-Type: application/json

{
  "customerId": "customer-123",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "workflowId": "workflow-123"
}
```

### 2. Create Scheduled Invoice Workflow

```http
POST /invoice/workflow/scheduled
Content-Type: application/json

{
  "customerId": "customer-123",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "workflowId": "workflow-123"
}
```

### 3. Create Recurring Invoice Workflow

```http
POST /invoice/workflow/recurring
Content-Type: application/json

{
  "customerId": "customer-123",
  "cronExpression": "0 0 * * *",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "workflowId": "workflow-123"
}
```

### 4. Create Scheduled Email Workflow

```http
POST /invoice/email/scheduled
Content-Type: application/json

{
  "customerId": "customer-123",
  "invoiceId": "invoice-456",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "workflowId": "workflow-123"
}
```

### 5. Get Customer Invoice Tasks

```http
GET /invoice/tasks/{customerId}
```

### 6. Get Invoice Workflow Status

```http
GET /invoice/status/{customerId}
```

## Testing Strategies

### 1. Unit Testing

#### InvoiceService Tests

```typescript
describe('InvoiceService', () => {
  describe('startInvoiceWorkflow', () => {
    it('should create and enqueue FETCH_ORDERS task', async () => {
      const dto = {
        customerId: 'customer-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        workflowId: 'workflow-123',
      };

      const result = await invoiceService.startInvoiceWorkflow(dto);

      expect(result).toEqual({
        message: 'Invoice workflow started',
        taskId: expect.any(String),
        workflowId: 'workflow-123',
      });
    });
  });

  describe('handleTaskCompletion', () => {
    it('should create next task in workflow chain', async () => {});
  });
});
```

#### InvoiceController Tests

```typescript
describe('InvoiceController', () => {
  describe('startInvoiceWorkflow', () => {
    it('should return workflow response', async () => {
      const dto = {
        customerId: 'customer-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      };

      const result = await controller.startInvoiceWorkflow(dto);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('workflowId');
    });
  });
});
```

### 2. Integration Testing

#### Complete Workflow Test

```typescript
describe('Invoice Workflow Integration', () => {
  it('should complete full invoice workflow', async () => {
    const workflowResponse = await request(app)
      .post('/invoice/workflow/start')
      .send({
        customerId: 'customer-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

    const taskId = workflowResponse.body.taskId;

    await simulateTaskCompletion(taskId, 'FETCH_ORDERS');
    await simulateTaskCompletion(taskId, 'CREATE_INVOICE');
    await simulateTaskCompletion(taskId, 'GENERATE_PDF');
    await simulateTaskCompletion(taskId, 'SEND_EMAIL');

    const status = await request(app)
      .get(`/invoice/status/customer-123`)
      .expect(200);

    expect(status.body.completedTasks).toBe(4);
    expect(status.body.totalTasks).toBe(4);
  });
});
```

### 3. End-to-End Testing

#### Manual Testing Scenarios

**Scenario 1: Basic Invoice Generation**

```bash
# 1. Start invoice workflow
curl -X POST http://localhost:3030/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'

# 2. Check task status
curl http://localhost:3030/invoice/status/customer-123

# 3. Monitor task completion
curl http://localhost:3030/tasks?status=processing
```

**Scenario 2: Scheduled Invoice**

```bash
# Create scheduled invoice for future execution
curl -X POST http://localhost:3030/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "scheduledAt": "2024-12-25T10:00:00Z",
    "dateFrom": "2024-12-01",
    "dateTo": "2024-12-31"
  }'
```

**Scenario 3: Recurring Invoice**

```bash
# Create daily recurring invoice
curl -X POST http://localhost:3030/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "cronExpression": "0 0 * * *",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

### 4. Performance Testing

#### Load Testing

```typescript
describe('Invoice Performance', () => {
  it('should handle concurrent invoice requests', async () => {
    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request(app)
          .post('/invoice/workflow/start')
          .send({
            customerId: `customer-${i}`,
            dateFrom: '2024-01-01',
            dateTo: '2024-01-31',
          }),
      );
    }

    const results = await Promise.all(promises);
    expect(results).toHaveLength(concurrentRequests);
  });
});
```

### 5. Error Handling Testing

#### Failure Scenarios

```typescript
describe('Invoice Error Handling', () => {
  it('should handle task failures gracefully', async () => {});

  it('should retry failed tasks', async () => {});
});
```

## Test Data Setup

### Database Seeding

```typescript
const seederConfig = {
  workflows: 5,
  tasksPerType: 10,
  customers: 20,
};

await databaseSeeder.seed(seederConfig);
```

### Mock External Services

```typescript
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: { pdfUrl: 'https://storage.example.com/invoice.pdf' },
  }),
}));

jest.mock('@nestjs/config', () => ({
  get: jest.fn().mockReturnValue('https://mock-email-service.com/send'),
}));
```

## Testing Checklist

### Functional Testing

- [ ] Start invoice workflow
- [ ] Create scheduled invoice workflow
- [ ] Create recurring invoice workflow
- [ ] Create scheduled email workflow
- [ ] Handle task completion chain
- [ ] Handle task failures
- [ ] Create compensation tasks
- [ ] Query customer tasks
- [ ] Get workflow status

### Non-Functional Testing

- [ ] Performance under load
- [ ] Error handling
- [ ] Retry mechanisms
- [ ] Database transactions
- [ ] Message queue processing
- [ ] Scheduled task execution

### Integration Testing

- [ ] Task service integration
- [ ] Queue service integration
- [ ] Messaging service integration
- [ ] Scheduler service integration
- [ ] External API calls
- [ ] Database operations

## Monitoring and Observability

### Logs to Monitor

```typescript
'Starting invoice workflow for customer: ${customerId}';
'Handling task completion for ${taskId} of type ${task.type}';
'Invoice workflow completed for customer: ${customerId}';
'Failed to handle task completion for ${taskId}';
```

### Metrics to Track

- Task completion rates
- Task failure rates
- Workflow completion times
- Queue processing times
- External API response times

## Troubleshooting Guide

### Common Issues

1. **Task Stuck in PENDING**
   - Check worker processes
   - Verify message queue connectivity
   - Check task payload validity

2. **Workflow Not Progressing**
   - Verify task completion handlers
   - Check workflow coordination
   - Monitor task status updates

3. **External API Failures**
   - Check network connectivity
   - Verify API endpoints
   - Review error logs

4. **Database Issues**
   - Check connection pool
   - Verify transaction handling
   - Monitor query performance

## Environment Setup

### Required Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: queue_worker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - '5672:5672'
      - '15672:15672'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
```

### Environment Variables

```bash
# .env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=queue_worker_test
MESSAGING_TRANSPORT=rmq
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
PDF_PROCESSOR_URL=https://mock-pdf-processor.com/generate
EMAIL_SERVICE_URL=https://mock-email-service.com/send
```

## Conclusion

This comprehensive testing approach ensures the Invoice usecase is robust, reliable, and performs well under various conditions. The combination of unit, integration, and end-to-end tests provides confidence in the system's functionality and helps identify issues early in the development cycle.
