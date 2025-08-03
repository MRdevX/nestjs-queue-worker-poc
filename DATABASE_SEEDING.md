# Database Seeding Guide

## Overview

The database seeder has been completely rewritten to be more efficient, dynamic, and realistic. It now uses [Faker.js](https://fakerjs.dev/) to generate realistic test data and supports configurable seeding parameters.

## Key Features

### 🎯 **Dynamic Data Generation**

- Uses Faker.js for realistic data generation
- No hard-coded values
- Generates proper UUIDs for all IDs
- Creates realistic business data (orders, invoices, products, etc.)

### 🔧 **Configurable Seeding**

- Customizable number of workflows, tasks per type, and customers
- Support for different seeding scenarios (light, default, heavy)
- Environment-based auto-seeding

### 📊 **Comprehensive Coverage**

- Seeds all task types with various statuses
- Creates realistic workflow definitions
- Generates appropriate task logs
- Tests different scenarios (completed, failed, pending, retrying)

## Configuration

### Seeder Configuration Interface

```typescript
interface ISeederConfig {
  workflows: number; // Number of workflows to create
  tasksPerType: number; // Number of tasks per task type
  customers: number; // Number of unique customer IDs
}
```

### Default Configuration

```typescript
{
  workflows: 3,
  tasksPerType: 5,
  customers: 10
}
```

## Usage

### 1. REST API Endpoints

#### Seed Database (Default Config)

```bash
curl -X POST http://localhost:3030/seeder/seed
```

#### Seed Database (Custom Config)

```bash
curl -X POST http://localhost:3030/seeder/seed \
  -H "Content-Type: application/json" \
  -d '{"workflows": 2, "tasksPerType": 3, "customers": 5}'
```

#### Clear Database

```bash
curl -X DELETE http://localhost:3030/seeder/clear
```

#### Reset Database (Clear + Seed)

```bash
curl -X POST http://localhost:3030/seeder/reset \
  -H "Content-Type: application/json" \
  -d '{"workflows": 1, "tasksPerType": 2, "customers": 3}'
```

### 2. Programmatic Usage

#### Using SeederService

```typescript
// Default seeding
await seederService.seedDatabase();

// Custom configuration
await seederService.seedDatabase({
  workflows: 2,
  tasksPerType: 3,
  customers: 5,
});
```

#### Using DatabaseSeeder Directly

```typescript
// Default seeding
await databaseSeeder.seed();

// Custom configuration
await databaseSeeder.seed({
  workflows: 2,
  tasksPerType: 3,
  customers: 5,
});
```

### 3. Environment-Based Auto-Seeding

Set the environment variable to enable auto-seeding on application startup:

```bash
AUTO_SEED_DATABASE=true
```

## Task Types Seeded

The seeder creates tasks for all available task types:

### Core Task Types

- `HTTP_REQUEST` - HTTP API calls with realistic endpoints and methods
- `DATA_PROCESSING` - Data transformation, validation, and aggregation tasks
- `COMPENSATION` - Compensation tasks for failed operations

### Invoice Workflow Task Types

- `FETCH_ORDERS` - Order retrieval with realistic order data
- `CREATE_INVOICE` - Invoice creation with order aggregation
- `GENERATE_PDF` - PDF generation with invoice data
- `SEND_EMAIL` - Email sending with invoice and PDF attachments

## Task Statuses

Each task type is seeded with various statuses:

- `PENDING` - Tasks waiting to be processed
- `PROCESSING` - Tasks currently being processed
- `COMPLETED` - Successfully completed tasks
- `FAILED` - Failed tasks with error messages
- `RETRYING` - Tasks being retried
- `CANCELLED` - Cancelled tasks

## Generated Data Structure

### Workflows

- **Invoice Generation Workflow** - Complete invoice processing pipeline
- **Data Processing Workflow** - Data processing and HTTP request pipeline
- **Scheduled Invoice Workflow** - Simplified invoice workflow

### Orders

- Realistic product names and prices
- Variable quantities and delivery dates
- Different order statuses (delivered, pending, cancelled)

### Invoices

- Proper invoice numbering (INV-YYYY-NNNN format)
- Calculated totals based on order items
- Realistic customer associations

### Task Logs

- Creation logs for all tasks
- Status-specific logs (completion, failure, processing)
- Random additional logs for variety
- Proper timestamps and log levels

## Testing Scenarios

### Light Seeding (Quick Testing)

```json
{
  "workflows": 1,
  "tasksPerType": 2,
  "customers": 3
}
```

**Use case**: Quick development and testing

### Default Seeding (Standard Testing)

```json
{
  "workflows": 3,
  "tasksPerType": 5,
  "customers": 10
}
```

**Use case**: Standard testing and development

### Heavy Seeding (Stress Testing)

```json
{
  "workflows": 5,
  "tasksPerType": 10,
  "customers": 20
}
```

**Use case**: Performance testing and stress testing

## Performance Considerations

### Batch Operations

- Tasks are inserted in batches for better performance
- Log entries are created in bulk
- Efficient database operations

### Memory Management

- Configurable data volumes
- Proper cleanup methods
- No memory leaks

### Database Constraints

- Respects foreign key relationships
- Proper UUID generation
- Valid enum values

## Error Handling

The seeder includes comprehensive error handling:

- **Duplicate Prevention**: Checks for existing data before seeding
- **Validation**: Ensures data integrity and relationships
- **Logging**: Detailed logging for debugging
- **Graceful Failures**: Continues operation even if some operations fail

## Best Practices

### For Development

1. Use light seeding for quick iterations
2. Use default seeding for comprehensive testing
3. Clear database between major changes

### For Testing

1. Use consistent configurations for reproducible tests
2. Test with different data volumes
3. Verify data relationships and constraints

### For Production

1. Never use auto-seeding in production
2. Use separate test databases
3. Backup data before seeding operations

## Troubleshooting

### Common Issues

#### "Database already contains data" Error

- The seeder prevents overwriting existing data
- Use the clear endpoint first: `DELETE /seeder/clear`

#### Performance Issues

- Reduce configuration values for faster seeding
- Use batch operations for large datasets
- Monitor database performance

#### Data Consistency Issues

- Ensure database schema is up to date
- Check foreign key relationships
- Verify enum values are correct

### Debug Mode

Enable detailed logging by setting the log level:

```typescript
// In your application configuration
Logger.overrideLogger(['debug']);
```

## Examples

### Complete Testing Workflow

```bash
# 1. Clear existing data
curl -X DELETE http://localhost:3030/seeder/clear

# 2. Seed with light configuration
curl -X POST http://localhost:3030/seeder/seed \
  -H "Content-Type: application/json" \
  -d '{"workflows": 1, "tasksPerType": 2, "customers": 3}'

# 3. Run your tests
npm run test

# 4. Clear for next test run
curl -X DELETE http://localhost:3030/seeder/clear
```

### Integration Testing

```typescript
describe('Invoice Workflow Integration', () => {
  beforeEach(async () => {
    // Clear and seed with test data
    await seederService.clearDatabase();
    await seederService.seedDatabase({
      workflows: 1,
      tasksPerType: 3,
      customers: 2,
    });
  });

  it('should process invoice workflow', async () => {
    // Your test logic here
  });
});
```

## Migration from Old Seeder

The new seeder is backward compatible. Existing code will continue to work:

```typescript
// Old way (still works)
await seederService.seedDatabase();

// New way (with configuration)
await seederService.seedDatabase({
  workflows: 2,
  tasksPerType: 3,
  customers: 5,
});
```

## Contributing

When adding new task types or data structures:

1. Update the `generatePayloadForTaskType` method
2. Add realistic data generation using Faker
3. Update this documentation
4. Add appropriate tests

## Dependencies

- `@faker-js/faker` - For realistic data generation
- `uuid` - For proper ID generation (via Faker)
- TypeORM - For database operations
