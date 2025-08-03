# Postman Collection Setup Guide

This guide will help you set up and use the Postman collection for the Queue Worker POC API.

## Files Included

1. **Queue-Worker-POC.postman_collection.json** - Complete API collection with all endpoints
2. **Queue-Worker-POC.postman_environment.json** - Environment variables for different configurations

## Quick Start

### 1. Import the Collection

1. Open Postman
2. Click "Import" button
3. Select the `Queue-Worker-POC.postman_collection.json` file
4. The collection will be imported with all endpoints organized in folders

### 2. Import the Environment

1. In Postman, click "Import" again
2. Select the `Queue-Worker-POC.postman_environment.json` file
3. The environment will be available in the environment dropdown

### 3. Select the Environment

1. In the top-right corner of Postman, select "Queue Worker POC - Development" from the environment dropdown
2. This will enable all the variables used in the collection

## Environment Variables

The environment includes the following variables:

### Base Configuration

- `baseUrl`: API base URL (default: `http://localhost:3030/api`)
- `taskId`: Task ID for testing (leave empty, will be populated after creating tasks)
- `customerId`: Customer ID for testing (default: `customer-123`)
- `customerId2`: Second customer ID for testing (default: `customer-456`)
- `customerIdFailed`: Customer ID for failed task testing (default: `customer-failed`)
- `customerIdPending`: Customer ID for pending task testing (default: `customer-pending`)
- `workflowId`: Workflow ID for testing (default: `workflow-123`)
- `invoiceId`: Invoice ID for testing (default: `invoice-123`)

### External Service URLs

- `ninoxBaseUrl`: Your Ninox instance URL
- `pdfProcessorUrl`: PDF generation service URL
- `emailServiceUrl`: Email service URL

### Authentication

- `apiToken`: Your API token for external services
- `ninoxApiKey`: Your Ninox API key

### Infrastructure

- `rabbitmqHost`, `rabbitmqPort`, `rabbitmqUser`, `rabbitmqPassword`: RabbitMQ configuration
- `dbHost`, `dbPort`, `dbName`, `dbUsername`, `dbPassword`: Database configuration

### Seeding Configuration

- `autoSeedDatabase`: Enable auto-seeding on startup (default: `false`)

## API Endpoints Overview

### Health Check

- **GET** `/health` - Check application health status

### Database Seeder

- **POST** `/seeder/seed` - Seed the database with initial test data
- **DELETE** `/seeder/clear` - Clear all seeded data from the database
- **POST** `/seeder/reset` - Clear the database and reseed with initial test data

### Task Management

- **POST** `/tasks` - Create a new task
- **GET** `/tasks` - Get all tasks in the database
- **GET** `/tasks/{id}` - Get task by ID
- **POST** `/tasks/{id}/retry` - Retry a failed task
- **POST** `/tasks/{id}/cancel` - Cancel a pending task
- **POST** `/tasks/{id}/compensate` - Create compensation task

### Queue Manager

- **GET** `/queue-manager/status` - Get detailed queue status
- **GET** `/queue-manager/overloaded` - Check if queue is overloaded
- **GET** `/queue-manager/failed-count` - Get failed tasks count
- **GET** `/queue-manager/pending-count` - Get pending tasks count

### Invoice Workflows

- **POST** `/invoice/workflow/start` - Start immediate invoice workflow
- **POST** `/invoice/workflow/scheduled` - Create scheduled invoice workflow
- **POST** `/invoice/workflow/recurring` - Create recurring invoice workflow
- **POST** `/invoice/email/scheduled` - Schedule email sending
- **GET** `/invoice/tasks/{customerId}` - Get customer invoice tasks
- **GET** `/invoice/status/{customerId}` - Get invoice workflow status

### Scheduler

- **POST** `/scheduler/tasks/scheduled` - Create scheduled task
- **POST** `/scheduler/tasks/recurring` - Create recurring task
- **GET** `/scheduler/tasks/scheduled` - Get scheduled tasks

## Testing Workflow with Database Seeding

### 1. Health Check

Start by testing the health endpoint to ensure the application is running:

```
GET {{baseUrl}}/health
```

### 2. Seed the Database

Seed the database with initial test data:

```
POST {{baseUrl}}/seeder/seed
```

### 3. Verify Seeded Data

Check that the database was seeded correctly:

```
GET {{baseUrl}}/tasks
```

### 4. Start Invoice Workflow

Test the complete invoice workflow using seeded data:

```
POST {{baseUrl}}/invoice/workflow/start
{
  "customerId": "{{customerId}}",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "workflowId": "{{workflowId}}"
}
```

### 5. Monitor Workflow Progress

Check the status of your workflow:

```
GET {{baseUrl}}/invoice/status/{{customerId}}
```

### 6. Test Different Scenarios

Use the different customer IDs to test various scenarios:

- `{{customerId}}` - Complete workflow with seeded data
- `{{customerId2}}` - Second customer for testing
- `{{customerIdFailed}}` - Test error scenarios
- `{{customerIdPending}}` - Test pending task processing

## Database Seeding Examples

### Complete Seeding Workflow

The collection includes a complete example workflow in the "Examples" folder:

1. **Seed Database** - Populate the database with test data
2. **Verify Seeded Data** - Check that tasks were created
3. **Start Invoice Workflow** - Begin testing with seeded data
4. **Check Workflow Status** - Monitor the workflow progress

### Manual Seeding Operations

You can also perform manual seeding operations:

- **Seed Database**: `POST {{baseUrl}}/seeder/seed`
- **Clear Database**: `DELETE {{baseUrl}}/seeder/clear`
- **Reset Database**: `POST {{baseUrl}}/seeder/reset`

## Task Types Available

The API supports the following task types:

- `http_request` - Make HTTP requests to external APIs
- `data_processing` - Process and transform data
- `compensation` - Handle failed tasks and rollback operations
- `fetch_orders` - Fetch orders from Ninox database
- `create_invoice` - Create invoice from orders
- `generate_pdf` - Generate PDF for invoice
- `send_email` - Send email with invoice

## Cron Expressions for Recurring Tasks

Common cron expressions for recurring tasks:

- `0 0 * * *` - Daily at midnight
- `0 2 * * *` - Daily at 2 AM
- `0 0 * * 1` - Weekly on Monday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
- `0 0 1 1 *` - Yearly on January 1st at midnight

## Error Handling

The API includes comprehensive error handling:

- **404 Not Found** - Resource not found
- **400 Bad Request** - Invalid request data
- **500 Internal Server Error** - Server-side errors

Failed tasks can be:

- Retried using the retry endpoints
- Compensated using compensation tasks
- Monitored through the queue management endpoints

## Environment Setup

Before using the collection, ensure your application is running with:

1. **Database**: PostgreSQL with the required tables
2. **Message Queue**: RabbitMQ for task processing
3. **Application**: Node.js application running on port 3030

### Docker Setup

If using Docker, start the services with:

```bash
docker-compose up -d
```

### Local Setup

For local development:

```bash
# Install dependencies
yarn install

# Start the application
yarn start:dev
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure the application is running on the correct port
2. **Database Connection Error**: Check PostgreSQL is running and accessible
3. **RabbitMQ Connection Error**: Verify RabbitMQ is running and credentials are correct
4. **Task Not Processing**: Check if workers are running and connected to RabbitMQ
5. **Seeding Fails**: Check database connection and entity definitions

### Debug Steps

1. Check application logs for errors
2. Verify environment variables are set correctly
3. Test health endpoint first
4. Seed the database and verify data was created
5. Monitor queue status for task processing
6. Check database for task records

## Advanced Usage

### Automated Testing

You can use the collection for automated testing by:

1. Setting up environment variables
2. Using Postman's test scripts
3. Running collections via Newman CLI

### Integration Testing

For integration testing:

1. Use the Examples folder for common scenarios
2. Chain requests using environment variables
3. Validate responses using test scripts
4. Use the database seeding workflow for consistent test data

### Database Seeding for Testing

The seeding functionality provides:

- **Consistent Test Data**: Same data structure for every test run
- **Realistic Scenarios**: Complete workflows with proper data relationships
- **Error Testing**: Pre-configured failed and pending tasks
- **Easy Reset**: Clear and reseed the database as needed

## Support

For issues or questions:

1. Check the application logs
2. Review the API documentation
3. Test with the provided examples
4. Verify environment configuration
5. Use the database seeding for consistent testing

## Collection Features

- **Organized Structure**: Endpoints grouped by functionality
- **Environment Variables**: Dynamic values for different environments
- **Examples**: Pre-configured examples for common use cases
- **Descriptions**: Detailed descriptions for each endpoint
- **Error Handling**: Examples of error responses
- **Workflow Examples**: Complete workflow demonstrations
- **Database Seeding**: Integrated seeding functionality for testing
- **Comprehensive Testing**: Full coverage of all API endpoints
