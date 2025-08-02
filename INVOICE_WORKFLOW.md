# Invoice Workflow Implementation

This document describes the implementation of the Invoice Workflow use case using the Queue/Worker system.

## Overview

The Invoice Workflow demonstrates how the queue/worker system can be used to automate the invoice creation and delivery process for a Ninox-based business. The workflow handles the complete process from fetching orders to sending invoices to customers.

## Workflow Steps

### 1. Fetch Orders (`FETCH_ORDERS`)

- **Worker**: `FetchOrdersWorker`
- **Purpose**: Retrieves orders from the Ninox database for a specific customer
- **Input**: Customer ID, optional date range
- **Output**: List of deliverable orders (delivered but not invoiced)
- **Message Pattern**: `fetch.orders`

### 2. Create Invoice (`CREATE_INVOICE`)

- **Worker**: `CreateInvoiceWorker`
- **Purpose**: Creates an invoice from the fetched orders
- **Input**: Customer ID, orders array
- **Output**: Invoice object with calculated totals
- **Message Pattern**: `create.invoice`

### 3. Generate PDF (`GENERATE_PDF`)

- **Worker**: `GeneratePdfWorker`
- **Purpose**: Generates PDF document for the invoice using external PDF processor
- **Input**: Invoice data, PDF processor URL
- **Output**: PDF URL
- **Message Pattern**: `generate.pdf`

### 4. Send Email (`SEND_EMAIL`)

- **Worker**: `SendEmailWorker`
- **Purpose**: Sends email to customer with invoice PDF attachment
- **Input**: Customer ID, invoice data, PDF URL
- **Output**: Email confirmation
- **Message Pattern**: `send.email`

## API Endpoints

### Start Invoice Workflow

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

### Create Scheduled Invoice Workflow

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

### Create Recurring Invoice Workflow

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

### Create Scheduled Email Workflow

```http
POST /invoice/email/scheduled
Content-Type: application/json

{
  "customerId": "customer-123",
  "invoiceId": "invoice-123",
  "scheduledAt": "2024-01-20T10:00:00Z",
  "workflowId": "workflow-123"
}
```

### Get Customer Invoice Tasks

```http
GET /invoice/tasks/{customerId}
```

### Get Invoice Workflow Status

```http
GET /invoice/status/{customerId}
```

## Usage Examples

### Daily Invoice Creation

```bash
# Create a recurring workflow that runs daily at midnight
curl -X POST http://localhost:3030/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "cronExpression": "0 0 * * *",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

### Weekly Email Sending

```bash
# Schedule email sending for end of week
curl -X POST http://localhost:3030/invoice/email/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "invoiceId": "invoice-123",
    "scheduledAt": "2024-01-20T10:00:00Z"
  }'
```

### Immediate Workflow Execution

```bash
# Start invoice workflow immediately
curl -X POST http://localhost:3030/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

## Configuration

### Environment Variables

```bash
# PDF Processor Configuration
PDF_PROCESSOR_URL=https://api.pdf-processor.com/generate
PDF_PROCESSOR_API_KEY=your-api-key

# Email Service Configuration
EMAIL_SERVICE_URL=https://api.email-service.com/send
EMAIL_SERVICE_API_KEY=your-api-key

# Ninox Database Configuration (for real implementation)
NINOX_API_URL=https://your-ninox-instance.com/api
NINOX_API_KEY=your-ninox-api-key
```

## Error Handling

### Retry Mechanism

- Each task has a maximum of 3 retries
- Exponential backoff: 2s, 4s, 8s (capped at 30s)
- Failed tasks trigger compensation workflows

### Compensation

- Failed workflows create compensation tasks
- Compensation tasks can rollback previous operations
- Ensures data consistency across the workflow

## Monitoring

### Task Status Tracking

```bash
# Check workflow status
curl http://localhost:3030/invoice/status/customer-123
```

### Queue Monitoring

```bash
# Check queue health
curl http://localhost:3030/queue-manager/status
```

## Testing

### Run Unit Tests

```bash
npm test src/app/worker/__tests__/fetch-orders.worker.spec.ts
npm test src/app/invoice/__tests__/invoice.controller.spec.ts
```

### Run Integration Tests

```bash
npm test src/app/invoice/__tests__/invoice-workflow.integration.spec.ts
```

## Architecture Benefits

### Scalability

- Each worker type can be scaled independently
- Multiple instances can handle high load
- Horizontal scaling support

### Reliability

- Message durability with RabbitMQ
- Automatic retry mechanisms
- Compensation for failed workflows

### Flexibility

- Support for immediate, scheduled, and recurring workflows
- Configurable task parameters
- Easy to extend with new worker types

### Observability

- Comprehensive logging
- Task status tracking
- Queue health monitoring

## Production Considerations

### Database Integration

- Replace mock data with actual Ninox API calls
- Implement proper error handling for external services
- Add database connection pooling

### Security

- Secure API key management
- Input validation and sanitization
- Rate limiting for external API calls

### Performance

- Implement caching for frequently accessed data
- Optimize database queries
- Add monitoring and alerting

### Deployment

- Container orchestration with Kubernetes
- Environment-specific configurations
- Automated deployment pipelines
