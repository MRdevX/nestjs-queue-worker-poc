# Queue Worker PoC - NestJS-based Distributed Task Processing System

A comprehensive proof-of-concept for a scalable, fault-tolerant queue/worker system built with NestJS, PostgreSQL, and RabbitMQ. This system demonstrates enterprise-grade task processing capabilities with workflow orchestration, retry mechanisms, and horizontal scalability.

## 🎯 Overview

This Queue Worker PoC demonstrates a distributed task processing system with:

- **Queue Manager**: Handles task queuing, assignment, and monitoring
- **Worker Nodes**: Execute various task types with fault tolerance and optimized patterns
- **Coordinator**: Orchestrates workflows and manages task dependencies
- **Database**: PostgreSQL for persistent task state and workflow definitions
- **Message Broker**: RabbitMQ for reliable asynchronous task distribution
- **Pattern Optimization**: Uses EventPattern for long-running tasks and MessagePattern for quick tasks

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
| `PDF_PROCESSOR_URL` | PDF service URL   | `mock-pdf-processor.com` |
| `EMAIL_SERVICE_URL` | Email service URL | `mock-email-service.com` |

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

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## 🐳 Deployment

The system is containerized with Docker and includes:

- **Multi-stage builds** for optimized production images
- **Health checks** for container monitoring
- **Environment separation** for dev/prod configurations
- **Kubernetes-ready** deployment manifests

## 📖 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture and design
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **API Documentation** - See examples above and test files for usage

---

**This PoC demonstrates a queue/worker system that can handle high volumes of tasks, support long-running transactions, and ensure data consistency and reliability.**
