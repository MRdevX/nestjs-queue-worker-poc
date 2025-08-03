# Database Seeding Guide

This guide explains how to use the database seeding functionality to populate your database with test data for invoice workflow testing.

## Overview

The database seeder provides a comprehensive way to populate your database with realistic test data, including:

- ✅ Sample workflows
- ✅ Completed, failed, and pending tasks
- ✅ Task logs with appropriate timestamps
- ✅ Realistic invoice workflow data

## Quick Start

### 1. Automated Testing (Recommended)

Use the comprehensive testing script that includes seeding:

```bash
./test-invoice-workflow-with-seeding.sh
```

### 2. Manual Seeding

```bash
# Seed the database
curl -X POST http://localhost:3030/api/seeder/seed

# Verify seeding worked
curl http://localhost:3030/api/tasks

# Clear the database
curl -X DELETE http://localhost:3030/api/seeder/clear

# Reset (clear + seed)
curl -X POST http://localhost:3030/api/seeder/reset
```

### 3. Auto-Seeding on Startup

Add to your environment:

```bash
AUTO_SEED_DATABASE=true
```

## API Endpoints

| Method   | Endpoint            | Description                      |
| -------- | ------------------- | -------------------------------- |
| `POST`   | `/api/seeder/seed`  | Seed the database with test data |
| `DELETE` | `/api/seeder/clear` | Clear all seeded data            |
| `POST`   | `/api/seeder/reset` | Clear and reseed the database    |

## Seeded Data Structure

### Workflows

1. **Invoice Generation Workflow**
   - Customer: `customer-123`
   - Complete workflow: `fetch_orders` → `create_invoice` → `generate_pdf` → `send_email`

2. **Scheduled Invoice Workflow**
   - Customer: `customer-456`
   - Basic workflow: `fetch_orders` → `create_invoice`

### Sample Tasks

#### Completed Tasks (customer-123)

- **FETCH_ORDERS**: Completed with 2 deliverable orders
- **CREATE_INVOICE**: Completed with invoice data
- **GENERATE_PDF**: Completed with PDF URL
- **SEND_EMAIL**: Completed with email confirmation

#### Failed Task

- **FETCH_ORDERS**: Customer `customer-failed` with simulated error

#### Pending Task

- **FETCH_ORDERS**: Customer `customer-pending` waiting to be processed

### Task Logs

Each task includes appropriate log entries:

- **INFO**: Task creation and completion
- **ERROR**: Task failures with error messages
- **Timestamps**: Matching task lifecycle events

## Sample Data Details

### Orders Data

```json
{
  "orders": [
    {
      "id": "order-1",
      "customerId": "customer-123",
      "status": "delivered",
      "invoiced": false,
      "items": [
        { "id": "item-1", "name": "Product A", "price": 100, "quantity": 2 },
        { "id": "item-2", "name": "Product B", "price": 50, "quantity": 1 }
      ],
      "totalAmount": 250,
      "deliveryDate": "2024-01-15"
    },
    {
      "id": "order-2",
      "customerId": "customer-123",
      "status": "delivered",
      "invoiced": false,
      "items": [
        { "id": "item-3", "name": "Product C", "price": 75, "quantity": 3 }
      ],
      "totalAmount": 225,
      "deliveryDate": "2024-01-16"
    }
  ]
}
```

### Invoice Data

```json
{
  "invoice": {
    "id": "invoice-123",
    "invoiceNumber": "INV-2024-001",
    "customerId": "customer-123",
    "totalAmount": 475,
    "grandTotal": 475,
    "items": [
      { "id": "item-1", "name": "Product A", "price": 100, "quantity": 2 },
      { "id": "item-2", "name": "Product B", "price": 50, "quantity": 1 },
      { "id": "item-3", "name": "Product C", "price": 75, "quantity": 3 }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

## Testing Scenarios

The seeded data enables testing of:

### 1. Complete Workflow

- Start with `customer-123` to see a full invoice workflow
- All tasks are pre-completed for verification

### 2. Error Handling

- Use `customer-failed` to test error scenarios
- Task is marked as failed with error message

### 3. Pending Tasks

- Use `customer-pending` to test task processing
- Task is in PENDING status ready for processing

### 4. New Workflows

- Create new workflows for any customer ID
- Compare with existing seeded data

## Database Schema

The seeder works with these tables:

- `workflows`: Workflow definitions
- `tasks`: Task records with payloads
- `task_logs`: Detailed execution logs

## Troubleshooting

### Seeding Fails

```bash
# Check if database is accessible
curl http://localhost:3030/api/health

# Clear and retry
curl -X DELETE http://localhost:3030/api/seeder/clear
curl -X POST http://localhost:3030/api/seeder/seed
```

### Data Already Exists

The seeder checks for existing data and skips seeding if data is found. To force reseeding:

```bash
curl -X POST http://localhost:3030/api/seeder/reset
```

### Entity Issues

If you get entity-related errors:

1. Check that all entities are properly imported
2. Verify database schema is up to date
3. Restart the application

## Integration with Testing

### Automated Testing

The seeding is integrated into the comprehensive testing script:

- Seeds data before testing
- Provides realistic test scenarios
- Enables end-to-end workflow testing

### Manual Testing

Use seeded data as a foundation for manual testing:

- Start with existing data
- Create new workflows
- Test error scenarios
- Verify data consistency

## Environment Variables

| Variable             | Default | Description                    |
| -------------------- | ------- | ------------------------------ |
| `AUTO_SEED_DATABASE` | `false` | Enable auto-seeding on startup |

## Best Practices

1. **Use seeded data as a foundation** for testing
2. **Clear database** between test runs if needed
3. **Verify seeding** before running tests
4. **Monitor logs** for seeding operations
5. **Use realistic data** for comprehensive testing

## Next Steps

After seeding:

1. Run the invoice workflow tests
2. Monitor task processing
3. Check database state
4. Verify workflow completion
5. Test error scenarios

The seeded data provides a solid foundation for comprehensive invoice workflow testing!
