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
- `seederWorkflows`: Number of workflows to create (default: `2`)
- `seederTasksPerType`: Number of tasks per task type (default: `3`)
- `seederCustomers`: Number of unique customer IDs (default: `5`)

## API Endpoints Overview

### Health Check

- **GET** `/health` - Check application health status

### Database Seeder

- **POST** `/seeder/seed` - Seed the database with default configuration (3 workflows, 5 tasks per type, 10 customers)
- **POST** `/seeder/seed` (with body) - Seed the database with custom configuration
- **DELETE** `/seeder/clear` - Clear all seeded data from the database
- **POST** `/seeder/reset` - Clear the database and reseed with default configuration
- **POST** `/seeder/reset` (with body) - Clear the database and reseed with custom configuration

### Task Management

- **POST** `/tasks` - Create a new task
- **GET** `/tasks` - Get all tasks in the database (with optional filtering by status, type, workflowId)
- **GET** `/tasks/{id}` - Get task by ID
- **GET** `/tasks/{id}/with-logs` - Get task with detailed logs
- **GET** `/tasks/{id}/with-workflow` - Get task with workflow details
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
- **GET** `/invoice/workflows` - Get all invoice workflows (with optional filtering)
- **GET** `/invoice/workflows/{workflowId}` - Get specific invoice workflow by ID
- **GET** `/invoice/workflows/{workflowId}/status` - Get detailed status of specific invoice workflow
- **POST** `/invoice/workflows/{workflowId}/cancel` - Cancel invoice workflow and pending tasks
- **GET** `/invoice/stats` - Get comprehensive invoice workflow statistics
- **GET** `/invoice/customers` - Get all customers with invoice workflows and statistics

### Scheduler

- **POST** `/scheduler/tasks/scheduled` - Create scheduled task
- **POST** `/scheduler/tasks/recurring` - Create recurring task
- **GET** `/scheduler/tasks/scheduled` - Get scheduled tasks

### Fault Management

- **POST** `/faults/retry/{taskId}` - Retry a failed task with exponential backoff
- **POST** `/faults/compensate/{taskId}` - Create a compensation task for a failed task
- **GET** `/faults/failed-tasks` - Get all failed tasks
- **GET** `/faults/retryable-tasks` - Get tasks that can be retried
- **GET** `/faults/compensation-tasks` - Get all compensation tasks
- **GET** `/faults/stats` - Get fault management statistics

### Workflow Management

- **POST** `/workflows` - Create a new workflow with task definitions
- **GET** `/workflows` - Get all workflows in the system
- **GET** `/workflows/active` - Get only active workflows
- **GET** `/workflows/{id}` - Get a specific workflow by ID
- **GET** `/workflows/{id}/with-tasks` - Get workflow details including all associated tasks
- **PUT** `/workflows/{id}` - Update an existing workflow
- **DELETE** `/workflows/{id}` - Delete a workflow (only if no associated tasks)
- **POST** `/workflows/{id}/start` - Start a workflow execution
- **POST** `/workflows/{id}/activate` - Activate a workflow
- **POST** `/workflows/{id}/deactivate` - Deactivate a workflow
- **GET** `/workflows/{id}/status` - Get detailed status of a workflow including task progress

## Testing Workflow with Dynamic Database Seeding

### 1. Health Check

Start by testing the health endpoint to ensure the application is running:

```
GET {{baseUrl}}/health
```

### 2. Choose Seeding Configuration

Select the appropriate seeding configuration based on your testing needs:

#### Quick Development Testing

```
POST {{baseUrl}}/seeder/seed
{
  "workflows": 1,
  "tasksPerType": 2,
  "customers": 3
}
```

#### Standard Testing (Recommended)

```
POST {{baseUrl}}/seeder/seed
```

#### Comprehensive Testing

```
POST {{baseUrl}}/seeder/seed
{
  "workflows": 5,
  "tasksPerType": 10,
  "customers": 20
}
```

#### Custom Testing

```
POST {{baseUrl}}/seeder/seed
{
  "workflows": {{seederWorkflows}},
  "tasksPerType": {{seederTasksPerType}},
  "customers": {{seederCustomers}}
}
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

The dynamic seeder now generates realistic data with proper UUIDs. Use the seeded data to test various scenarios:

- **All Task Types**: The seeder creates tasks for all 7 task types (HTTP_REQUEST, DATA_PROCESSING, COMPENSATION, FETCH_ORDERS, CREATE_INVOICE, GENERATE_PDF, SEND_EMAIL)
- **All Task Statuses**: Tasks are created with all 6 statuses (PENDING, PROCESSING, COMPLETED, FAILED, RETRYING, CANCELLED)
- **Realistic Data**: All data is generated using Faker.js for realistic business scenarios
- **Dynamic Customer IDs**: Each run generates new UUID-based customer IDs
- **Realistic Payloads**: Task payloads contain realistic business data (orders, invoices, products, etc.)

### 7. Test All Task Types

Use the "Test All Task Types" example workflow to verify comprehensive seeding:

1. **Seed with All Task Types** - Creates tasks for all available task types
2. **Get Tasks by Type** - View the distribution of task types and statuses
3. **Check Queue Status** - Monitor queue health and task distribution

## Database Seeding Examples

### Complete Seeding Workflows

The collection includes multiple example workflows in the "Examples" folder:

#### Default Seeding Workflow

1. **Seed Database (Default)** - Populate the database with default configuration
2. **Verify Seeded Data** - Check that tasks were created
3. **Start Invoice Workflow** - Begin testing with seeded data
4. **Check Workflow Status** - Monitor the workflow progress

#### Light Seeding Workflow (Quick Testing)

1. **Seed Database (Light)** - Populate the database with minimal data for quick testing
2. **Verify Seeded Data** - Check that tasks were created
3. **Start Invoice Workflow** - Begin testing with seeded data
4. **Check Workflow Status** - Monitor the workflow progress

#### Custom Seeding Workflow

1. **Seed Database (Custom)** - Populate the database with custom configuration using environment variables
2. **Verify Seeded Data** - Check that tasks were created
3. **Start Invoice Workflow** - Begin testing with seeded data
4. **Check Workflow Status** - Monitor the workflow progress

#### Test All Task Types Workflow

1. **Seed with All Task Types** - Creates comprehensive test data for all task types
2. **Get Tasks by Type** - View the distribution of task types and statuses
3. **Check Queue Status** - Monitor queue health and task distribution

#### Fault Management Workflow

1. **Get Failed Tasks** - View all failed tasks in the system
2. **Retry Failed Task** - Retry a specific failed task with exponential backoff
3. **Get Fault Statistics** - Monitor fault management statistics and error types

#### Workflow Management Example

1. **Create Workflow** - Create a new workflow with task definitions and transitions
2. **Get Workflow Status** - Check the status of the created workflow
3. **Start Workflow** - Start the workflow execution

#### Invoice Statistics Workflow

1. **Get Invoice Statistics** - Get comprehensive invoice workflow statistics
2. **Get Customers with Invoices** - View all customers with invoice workflows
3. **Get Invoice Workflows** - Monitor all invoice workflows in the system

### Manual Seeding Operations

You can also perform manual seeding operations with different configurations:

#### Default Operations

- **Seed Database**: `POST {{baseUrl}}/seeder/seed`
- **Clear Database**: `DELETE {{baseUrl}}/seeder/clear`
- **Reset Database**: `POST {{baseUrl}}/seeder/reset`

#### Light Operations (Quick Testing)

- **Seed Database**: `POST {{baseUrl}}/seeder/seed` with `{"workflows": 1, "tasksPerType": 2, "customers": 3}`
- **Reset Database**: `POST {{baseUrl}}/seeder/reset` with `{"workflows": 1, "tasksPerType": 2, "customers": 3}`

#### Heavy Operations (Stress Testing)

- **Seed Database**: `POST {{baseUrl}}/seeder/seed` with `{"workflows": 5, "tasksPerType": 10, "customers": 20}`
- **Reset Database**: `POST {{baseUrl}}/seeder/reset` with `{"workflows": 5, "tasksPerType": 10, "customers": 20}`

#### Custom Operations

- **Seed Database**: `POST {{baseUrl}}/seeder/seed` with `{"workflows": {{seederWorkflows}}, "tasksPerType": {{seederTasksPerType}}, "customers": {{seederCustomers}}}`
- **Reset Database**: `POST {{baseUrl}}/seeder/reset` with `{"workflows": {{seederWorkflows}}, "tasksPerType": {{seederTasksPerType}}, "customers": {{seederCustomers}}}`

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

The dynamic seeding functionality provides:

- **Configurable Test Data**: Different data volumes for different testing needs
- **Realistic Scenarios**: Faker-generated realistic business data with proper relationships
- **Comprehensive Coverage**: All task types and statuses with realistic payloads
- **Flexible Configuration**: Light, default, and heavy seeding options
- **Dynamic Data**: No hard-coded values, fresh realistic data every time
- **Easy Reset**: Clear and reseed the database with custom configurations

#### Seeding Configurations

- **Light Seeding**: 1 workflow, 2 tasks per type, 3 customers (~14 tasks total)
- **Default Seeding**: 3 workflows, 5 tasks per type, 10 customers (~35 tasks total)
- **Heavy Seeding**: 5 workflows, 10 tasks per type, 20 customers (~70 tasks total)
- **Custom Seeding**: Configurable via environment variables or request body

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
- **Dynamic Database Seeding**: Configurable seeding with realistic Faker-generated data
- **Multiple Seeding Configurations**: Light, default, heavy, and custom seeding options
- **Comprehensive Testing**: Full coverage of all API endpoints and task types
- **Realistic Test Data**: Business-like data for better testing scenarios
