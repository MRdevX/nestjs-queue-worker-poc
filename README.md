# Queue Worker PoC - NestJS-based Distributed Task Processing System

A proof-of-concept (PoC) demonstrating a queue/worker system built with NestJS, PostgreSQL, and multiple message brokers (RabbitMQ, NATS, Redis). This PoC showcases task processing patterns, workflow orchestration, retry mechanisms, multi-provider messaging, and microservice communication concepts for learning and evaluation purposes.

## 🎯 Overview

This Queue Worker PoC demonstrates a distributed task processing system with:

- **Queue Manager**: Handles task queuing, assignment, and monitoring
- **Worker Nodes**: Execute various task types with fault tolerance and optimized patterns
- **Coordinator**: Orchestrates workflows and manages task dependencies
- **Database**: PostgreSQL for persistent task state and workflow definitions
- **Multi-Provider Messaging**: Support for RabbitMQ, NATS, and Redis with factory pattern
- **Pattern Optimization**: Uses EventPattern for all tasks with fire-and-forget semantics
- **Invoice Workflow**: Complete end-to-end invoice processing workflow with scheduling
- **Comprehensive Testing**: Unit, integration, and end-to-end tests with extensive coverage

**Note**: This is a PoC demonstrating concepts. Message broker microservice transport requires separate microservice applications. A single application cannot act as both server and client simultaneously. For production use, workers should be implemented as separate microservices.

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Yarn package manager

### Development Environment

```bash
# Clone and setup
git clone <repository-url>
cd queue-worker-poc

# Start development environment
./start-dev.sh

# Or manually:
docker compose -f docker-compose.dev.yml up --build
```

### Production Environment

```bash
# Start production environment
./start-prod.sh

# Or manually:
docker compose up --build -d
```

## 📋 API Endpoints

### Task Management

- `POST /api/task` - Create new task
- `GET /api/task/:id` - Get task details
- `POST /api/task/:id/retry` - Retry failed task
- `POST /api/task/:id/compensate` - Trigger compensation

### Queue Management

- `GET /api/queue-manager/status` - Queue health status
- `GET /api/queue-manager/overloaded` - Overload detection
- `GET /api/queue-manager/failed-count` - Failed tasks count
- `GET /api/queue-manager/pending-count` - Pending tasks count

### Scheduler

- `POST /api/scheduler/tasks/scheduled` - Create scheduled task
- `POST /api/scheduler/tasks/recurring` - Create recurring task
- `GET /api/scheduler/tasks/scheduled` - List scheduled tasks

### Invoice Workflow

- `POST /api/invoice/workflow/start` - Start invoice workflow
- `POST /api/invoice/workflow/scheduled` - Create scheduled invoice workflow
- `POST /api/invoice/workflow/recurring` - Create recurring invoice workflow
- `POST /api/invoice/email/scheduled` - Create scheduled email workflow
- `GET /api/invoice/tasks/:customerId` - Get customer invoice tasks
- `GET /api/invoice/status/:customerId` - Get invoice workflow status

### Health

- `GET /api/health` - Application health check

## 🔧 Configuration

### Environment Variables

| Variable            | Description       | Default                  |
| ------------------- | ----------------- | ------------------------ |
| `NODE_ENV`          | Environment mode  | `development`            |
| `PORT`              | Application port  | `3030`                   |
| `DB_HOST`           | PostgreSQL host   | `localhost`              |
| `DB_PORT`           | PostgreSQL port   | `5432`                   |
| `DB_NAME`           | Database name     | `queue_worker`           |
| `DB_USERNAME`       | Database username | `postgres`               |
| `DB_PASSWORD`       | Database password | `postgres`               |
| `RABBITMQ_HOST`     | RabbitMQ host     | `localhost`              |
| `RABBITMQ_USER`     | RabbitMQ username | `guest`                  |
| `RABBITMQ_PASSWORD` | RabbitMQ password | `guest`                  |
| `NATS_SERVERS`      | NATS servers      | `nats://localhost:4222`  |
| `REDIS_HOST`        | Redis host        | `localhost`              |
| `REDIS_PORT`        | Redis port        | `6379`                   |
| `REDIS_PASSWORD`    | Redis password    | `undefined`              |
| `REDIS_DB`          | Redis database    | `0`                      |
| `PDF_PROCESSOR_URL` | PDF service URL   | `mock-pdf-processor.com` |
| `EMAIL_SERVICE_URL` | Email service URL | `mock-email-service.com` |

### Messaging Configuration

The system supports multiple message brokers through a factory pattern:

```typescript
// S2S Configuration
s2s: {
  transport: 'rmq' | 'nats' | 'redis', // Default: 'rmq'
  options: {
    // RabbitMQ options
    urls: ['amqp://localhost:5672'],
    queue: 'task-queue',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'failed'
    },

    // NATS options
    servers: ['nats://localhost:4222'],

    // Redis options
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0
  }
}
```

### Task Types

- **HTTP_REQUEST**: External API calls and webhooks (quick tasks with immediate response)
- **DATA_PROCESSING**: Data transformation and batch operations (long-running tasks)
- **COMPENSATION**: Rollback and cleanup operations (long-running tasks)
- **FETCH_ORDERS**: External API calls to fetch customer orders (long-running tasks)
- **CREATE_INVOICE**: Business logic for invoice creation (long-running tasks)
- **GENERATE_PDF**: PDF generation via external services (long-running tasks)
- **SEND_EMAIL**: Email sending via external services (long-running tasks)

### Task Statuses

- **PENDING**: Task is queued and waiting for processing
- **PROCESSING**: Task is currently being executed
- **COMPLETED**: Task finished successfully
- **FAILED**: Task failed and exceeded retry limits
- **RETRYING**: Task is being retried after failure
- **CANCELLED**: Task was cancelled manually

## 📚 Usage Examples

### Create HTTP Request Task (Quick Task - MessagePattern)

```bash
curl -X POST http://localhost:3030/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "http_request",
    "payload": {
      "method": "POST",
      "url": "https://api.example.com/webhook",
      "headers": {"Authorization": "Bearer token"},
      "body": {"event": "task_completed"}
    }
  }'
```

### Create Data Processing Task (Long-running Task - EventPattern)

```bash
curl -X POST http://localhost:3030/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "data_processing",
    "payload": {
      "dataset": "customer_data_2024",
      "operation": "transform",
      "forceFailure": false
    }
  }'
```

### Invoice Workflow Examples

#### Start Invoice Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

#### Create Scheduled Invoice Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/scheduled \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "scheduledAt": "2024-02-01T10:00:00Z",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

#### Create Recurring Invoice Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/recurring \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "cronExpression": "0 0 1 * *",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
```

#### Get Invoice Workflow Status

```bash
curl -X GET http://localhost:3030/api/invoice/status/customer-123
```

### Create Workflow

```json
{
  "name": "Order Processing Workflow",
  "definition": {
    "initialTask": {
      "type": "http_request",
      "payload": {
        "method": "POST",
        "url": "/api/orders/validate"
      }
    },
    "transitions": {
      "http_request": {
        "type": "data_processing",
        "payload": {
          "operation": "process_order"
        }
      }
    }
  }
}
```

## 🧪 Testing

The project includes comprehensive testing with extensive coverage:

### Test Structure

- **Unit Tests**: Individual component testing with mocked dependencies
- **Integration Tests**: Module-level testing with real database connections
- **End-to-End Tests**: Full workflow testing with real HTTP requests
- **Mock Factories**: Reusable mock objects for consistent testing

### Running Tests

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov

# Specific test files
yarn test src/app/core/messaging
yarn test:e2e test/invoice-workflow.e2e-spec.ts
```

### Test Coverage

- **Messaging Module**: Complete coverage of multi-provider messaging system
- **Invoice Workflow**: End-to-end testing of complete invoice processing
- **Task Management**: Comprehensive task lifecycle testing
- **Error Handling**: Failure scenarios and compensation logic
- **Concurrency**: Multiple concurrent workflow testing

### E2E Test Features

- **Invoice Workflow Chain**: Complete workflow from order fetch to email delivery
- **Scheduled Workflows**: Testing of scheduled and recurring task creation
- **Error Scenarios**: Task failure handling and compensation logic
- **Concurrent Operations**: Multiple simultaneous workflow processing
- **Status Monitoring**: Real-time workflow status tracking

## 🏗️ Architecture

### Messaging System

The messaging system supports multiple providers through a factory pattern:

- **BaseProvider**: Abstract base class for all messaging providers
- **RabbitMQProvider**: RabbitMQ implementation with queue management
- **NatsProvider**: NATS implementation for high-performance messaging
- **RedisProvider**: Redis implementation for simple pub/sub
- **MessagingFactoryService**: Factory service for provider creation
- **MessagingService**: High-level service for task publishing and event emission

### Invoice Workflow

The invoice workflow system provides:

- **Workflow Orchestration**: Complete invoice processing pipeline
- **Scheduling**: One-time and recurring workflow scheduling
- **Status Tracking**: Real-time workflow and task status monitoring
- **Error Handling**: Automatic retry and compensation mechanisms
- **Customer Management**: Per-customer workflow isolation

## 🐳 Deployment

The system is containerized with Docker and includes:

- **Multi-stage builds** for optimized production images
- **Health checks** for container monitoring
- **Environment separation** for dev/prod configurations
- **Kubernetes-ready** deployment manifests
- **Multi-provider support** for different messaging infrastructures

## 📖 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture and design
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[INVOICE_TESTING_DOCUMENTATION.md](./INVOICE_TESTING_DOCUMENTATION.md)** - Comprehensive invoice workflow testing guide
- **[INVOICE_TESTING_QUICK_START.md](./INVOICE_TESTING_QUICK_START.md)** - Quick start guide for invoice workflow testing
- **API Documentation** - See examples above and test files for usage
- **Test Documentation** - Extensive test coverage with mock factories and helpers

## 🔧 Development

### Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── messaging/          # Multi-provider messaging system
│   │   │   ├── providers/      # Message broker implementations
│   │   │   ├── services/       # Messaging services
│   │   │   └── types/          # Messaging interfaces
│   │   └── ...
│   ├── invoice/               # Invoice workflow system
│   └── ...
test/
├── mocks/                     # Mock factories and helpers
├── helpers/                   # Test helper utilities
└── *.e2e-spec.ts             # End-to-end test suites
```

### Key Features

- **Multi-Provider Messaging**: Support for RabbitMQ, NATS, and Redis
- **Factory Pattern**: Clean provider abstraction and instantiation
- **Comprehensive Testing**: Unit, integration, and e2e test coverage
- **Invoice Workflow**: Complete business process automation
- **Scheduling**: Flexible task scheduling and recurring workflows
- **Error Handling**: Robust failure handling and compensation logic

---

**This PoC demonstrates advanced queue/worker concepts, multi-provider messaging, and comprehensive testing patterns for learning and evaluation purposes. It is not intended for production use without significant modifications and additional features.**
