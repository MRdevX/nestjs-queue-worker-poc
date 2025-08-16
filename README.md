# Queue Worker PoC - NestJS-based Distributed Task Processing System

A proof-of-concept demonstrating a queue/worker system built with NestJS, PostgreSQL, and multiple message brokers (RabbitMQ, NATS, Redis). Features task processing, workflow orchestration, retry mechanisms, and multi-provider messaging.

## 🎯 Overview

- **Queue Manager**: Task queuing, assignment, and monitoring
- **Worker Nodes**: Execute tasks with fault tolerance and retry logic
- **Workflow Orchestration**: Complete invoice processing pipeline
- **Multi-Provider Messaging**: Support for RabbitMQ, NATS, and Redis
- **Scheduling**: One-time and recurring task scheduling
- **Comprehensive Testing**: Unit, integration, and e2e tests

**Note**: This is a PoC for learning purposes. For production, workers should be separate microservices.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+

### Development

```bash
git clone <repository-url>
cd queue-worker-poc
./start-dev.sh
```

### Production

```bash
./start-prod.sh
```

## 📋 Key API Endpoints

### Task Management

- `POST /api/task` - Create task
- `GET /api/task/:id` - Get task details
- `POST /api/task/:id/retry` - Retry failed task

### Queue Management

- `GET /api/queue-manager/status` - Queue health
- `GET /api/queue-manager/failed-count` - Failed tasks count

### Invoice Workflow

- `POST /api/invoice/workflow/start` - Start invoice workflow
- `POST /api/invoice/workflow/scheduled` - Scheduled workflow
- `GET /api/invoice/status/:customerId` - Workflow status

### Scheduler

- `POST /api/scheduler/tasks/scheduled` - Create scheduled task
- `POST /api/scheduler/tasks/recurring` - Create recurring task

## 🔧 Configuration

### Environment Variables

| Variable        | Description     | Default                 |
| --------------- | --------------- | ----------------------- |
| `NODE_ENV`      | Environment     | `development`           |
| `PORT`          | App port        | `3030`                  |
| `DB_HOST`       | PostgreSQL host | `localhost`             |
| `RABBITMQ_HOST` | RabbitMQ host   | `localhost`             |
| `NATS_SERVERS`  | NATS servers    | `nats://localhost:4222` |
| `REDIS_HOST`    | Redis host      | `localhost`             |

### Messaging Configuration

```typescript
s2s: {
  transport: 'rmq' | 'nats' | 'redis', // Default: 'rmq'
  options: {
    // Provider-specific options
  }
}
```

## 📚 Usage Examples

### Create Task

```bash
curl -X POST http://localhost:3030/api/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "http_request",
    "payload": {
      "method": "POST",
      "url": "https://api.example.com/webhook",
      "body": {"event": "task_completed"}
    }
  }'
```

### Start Invoice Workflow

```bash
curl -X POST http://localhost:3030/api/invoice/workflow/start \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-123",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  }'
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

## 🏗️ Architecture

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Key Components

- **CoreModule**: Configuration, database, messaging
- **TaskModule**: Task management and persistence
- **WorkerModule**: Task execution engine
- **QueueModule**: Queue management and monitoring
- **SchedulerModule**: Task scheduling
- **WorkflowModule**: Workflow orchestration
- **InvoiceModule**: Invoice processing workflow

### Design Patterns

- **Factory Pattern**: Multi-provider messaging
- **Unified Worker**: Single worker for all task types
- **Workflow Orchestration**: Task dependency management
- **EventPattern**: Fire-and-forget semantics

## 🐳 Deployment

Containerized with Docker:

- Multi-stage builds for production
- Health checks for monitoring
- Environment separation (dev/prod)
- Kubernetes-ready manifests

## 📖 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history
- **[INVOICE_TESTING_DOCUMENTATION.md](./INVOICE_TESTING_DOCUMENTATION.md)** - Invoice workflow testing
- **[INVOICE_TESTING_QUICK_START.md](./INVOICE_TESTING_QUICK_START.md)** - Quick testing guide

---

**This PoC demonstrates advanced queue/worker concepts and multi-provider messaging for learning purposes.**
