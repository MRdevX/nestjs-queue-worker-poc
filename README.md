# Queue Worker PoC - NestJS-based Distributed Task Processing System

A comprehensive proof-of-concept for a scalable, fault-tolerant queue/worker system built with NestJS, PostgreSQL, and RabbitMQ. This system demonstrates enterprise-grade task processing capabilities with workflow orchestration, retry mechanisms, and horizontal scalability.

## 🎯 PoC Overview

This Queue Worker PoC demonstrates a production-ready distributed task processing system that meets all the specified requirements:

- **Queue Manager**: Handles task queuing, assignment, and monitoring
- **Worker Nodes**: Execute various task types with fault tolerance
- **Coordinator**: Orchestrates workflows and manages task dependencies
- **Database**: PostgreSQL for persistent task state and workflow definitions
- **Message Broker**: RabbitMQ for reliable asynchronous task distribution

## 🏗️ System Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP API      │    │   Scheduler     │    │   Coordinator   │
│   (Controllers) │    │   (Cron Jobs)   │    │   (Workflows)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Task Service          │
                    │   (Task Management)       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Messaging Service       │
                    │   (RabbitMQ Client)       │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │      RabbitMQ             │
                    │   (Message Broker)        │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Worker Nodes            │
                    │  (HTTP, Data, Compensation)│
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   PostgreSQL              │
                    │   (Task State & Logs)     │
                    └───────────────────────────┘
```

### Key Features

- **🔄 Asynchronous Task Processing**: Tasks are queued and processed asynchronously
- **🛡️ Fault Tolerance**: Automatic retry mechanisms with exponential backoff
- **📊 Task Monitoring**: Comprehensive logging and status tracking
- **⚡ Horizontal Scalability**: Multiple worker instances can be deployed
- **🔄 Workflow Orchestration**: Complex task dependencies and transitions
- **⏰ Task Scheduling**: Support for scheduled and recurring tasks
- **🛠️ Compensation Handling**: Rollback mechanisms for failed workflows

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

## 📋 System Components

### 1. Queue Manager (`/queue-manager`)

Manages task queues and provides monitoring capabilities:

- **Status Monitoring**: Real-time queue health and metrics
- **Overload Detection**: Automatic detection of system overload
- **Task Counts**: Pending, failed, and processing task statistics

**Endpoints:**

- `GET /api/queue-manager/status` - Queue health status
- `GET /api/queue-manager/overloaded` - Overload detection
- `GET /api/queue-manager/failed-count` - Failed tasks count
- `GET /api/queue-manager/pending-count` - Pending tasks count

### 2. Task Management (`/task`)

Core task lifecycle management:

- **Task Creation**: Create tasks with various types and payloads
- **Status Updates**: Track task execution progress
- **Retry Logic**: Automatic retry with configurable limits
- **Task Logging**: Comprehensive audit trail

**Endpoints:**

- `POST /api/task` - Create new task
- `GET /api/task/:id` - Get task details
- `POST /api/task/:id/retry` - Retry failed task
- `POST /api/task/:id/compensate` - Trigger compensation

### 3. Worker Nodes

Specialized workers for different task types:

#### HTTP Worker

- Handles HTTP API calls and webhook notifications
- Supports GET, POST, PUT, DELETE methods
- Configurable timeout and retry policies

#### Data Processing Worker

- Processes data transformation tasks
- Supports batch operations and data validation
- Handles large dataset processing

#### Compensation Worker

- Manages rollback operations for failed workflows
- Implements saga pattern for distributed transactions
- Ensures data consistency across services

### 4. Scheduler (`/scheduler`)

Task scheduling and recurring job management:

- **Scheduled Tasks**: Execute tasks at specific times
- **Recurring Tasks**: Cron-based task execution
- **Automatic Processing**: Background job for due tasks

**Endpoints:**

- `POST /api/scheduler/tasks/scheduled` - Create scheduled task
- `POST /api/scheduler/tasks/recurring` - Create recurring task
- `GET /api/scheduler/tasks/scheduled` - List scheduled tasks

### 5. Workflow Coordinator

Orchestrates complex task workflows:

- **Workflow Definition**: JSON-based workflow configuration
- **Task Transitions**: Automatic progression between tasks
- **Error Handling**: Compensation and rollback mechanisms
- **Dependency Management**: Task ordering and prerequisites

## 🔧 Configuration

### Environment Variables

| Variable            | Description       | Default        |
| ------------------- | ----------------- | -------------- |
| `NODE_ENV`          | Environment mode  | `development`  |
| `PORT`              | Application port  | `3030`         |
| `DB_HOST`           | PostgreSQL host   | `localhost`    |
| `DB_PORT`           | PostgreSQL port   | `5432`         |
| `DB_NAME`           | Database name     | `queue_worker` |
| `DB_USERNAME`       | Database username | `postgres`     |
| `DB_PASSWORD`       | Database password | `postgres`     |
| `RABBITMQ_HOST`     | RabbitMQ host     | `localhost`    |
| `RABBITMQ_USER`     | RabbitMQ username | `guest`        |
| `RABBITMQ_PASSWORD` | RabbitMQ password | `guest`        |

### Task Types

The system supports three main task types:

1. **HTTP_REQUEST**: External API calls and webhooks
2. **DATA_PROCESSING**: Data transformation and batch operations
3. **COMPENSATION**: Rollback and cleanup operations

### Task Statuses

- **PENDING**: Task is queued and waiting for processing
- **PROCESSING**: Task is currently being executed
- **COMPLETED**: Task finished successfully
- **FAILED**: Task failed and exceeded retry limits
- **RETRYING**: Task is being retried after failure
- **CANCELLED**: Task was cancelled manually

## 📊 Monitoring & Observability

### Health Checks

- **Application Health**: `GET /api/health`
- **Queue Status**: `GET /api/queue-manager/status`
- **Database Connectivity**: Built-in health checks
- **RabbitMQ Connectivity**: Message broker health monitoring

### Logging

- **Structured Logging**: Winston-based logging with JSON format
- **Task Logs**: Per-task execution logs with different levels
- **Audit Trail**: Complete task lifecycle tracking
- **Error Tracking**: Detailed error information and stack traces

### Metrics

- **Queue Metrics**: Pending, processing, completed, failed counts
- **Performance Metrics**: Task execution times and throughput
- **Error Rates**: Failure rates and retry statistics
- **System Health**: Overall system health indicators

## 🔄 Fault Tolerance & Reliability

### Retry Mechanisms

- **Exponential Backoff**: Configurable retry delays
- **Maximum Retries**: Per-task retry limits
- **Retry Policies**: Different strategies for different task types
- **Dead Letter Queues**: Failed task handling

### Compensation Handling

- **Saga Pattern**: Distributed transaction management
- **Rollback Operations**: Automatic cleanup on failures
- **Data Consistency**: Ensures system integrity
- **Partial Failure Recovery**: Handles partial workflow failures

### High Availability

- **Horizontal Scaling**: Multiple worker instances
- **Load Balancing**: RabbitMQ-based task distribution
- **Database Resilience**: PostgreSQL with connection pooling
- **Graceful Shutdown**: Proper resource cleanup

## 🚀 Scalability Features

### Horizontal Scaling

- **Worker Scaling**: Deploy multiple worker instances
- **Queue Partitioning**: Distribute load across queues
- **Database Scaling**: Read replicas and connection pooling
- **Message Broker Scaling**: RabbitMQ clustering support

### Performance Optimization

- **Connection Pooling**: Efficient database connections
- **Message Batching**: Batch processing capabilities
- **Caching**: Redis integration ready
- **Async Processing**: Non-blocking task execution

## 🧪 Testing

### Test Coverage

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov
```

### Test Structure

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Mock Factories**: Comprehensive test data generation
- **Test Utilities**: Reusable testing helpers

## 🐳 Deployment

### Docker Support

- **Multi-stage Builds**: Optimized production images
- **Health Checks**: Container health monitoring
- **Environment Separation**: Dev/prod configurations
- **Volume Management**: Persistent data storage

### Cloud Deployment

- **Kubernetes Ready**: Container orchestration support
- **Environment Variables**: Cloud-native configuration
- **Secrets Management**: Secure credential handling
- **Auto-scaling**: Horizontal pod autoscaling support

## 📈 Production Considerations

### Security

- **Input Validation**: Comprehensive request validation
- **Authentication**: JWT-based authentication ready
- **Authorization**: Role-based access control
- **Data Encryption**: TLS/SSL encryption support

### Monitoring

- **Application Metrics**: Prometheus metrics export
- **Distributed Tracing**: OpenTelemetry integration
- **Alerting**: Failure and performance alerts
- **Dashboard**: Grafana dashboards for visualization

### Backup & Recovery

- **Database Backups**: Automated PostgreSQL backups
- **Message Persistence**: RabbitMQ message durability
- **Disaster Recovery**: Multi-region deployment support
- **Data Retention**: Configurable log retention policies

## 🔮 Future Enhancements

### Planned Features

- **WebSocket Support**: Real-time task status updates
- **GraphQL API**: Flexible data querying
- **Plugin System**: Extensible worker architecture
- **Machine Learning**: Predictive task scheduling

### Scalability Improvements

- **Event Sourcing**: Complete audit trail
- **CQRS Pattern**: Command/Query responsibility separation
- **Microservices**: Service decomposition
- **API Gateway**: Centralized API management

## 📚 API Documentation

### Task Creation Example

```bash
# Create HTTP request task
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

### Workflow Definition Example

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions and support:

- Create an issue in the repository
- Check the documentation
- Review the test examples
- Examine the configuration files

---

**This PoC demonstrates a production-ready queue/worker system that can handle high volumes of tasks, support long-running transactions, and ensure data consistency and reliability. The system is designed for cloud deployment with horizontal scalability and fault tolerance.**
