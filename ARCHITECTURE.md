# Queue Worker PoC - Architecture Documentation

## Overview

This document provides a detailed architectural overview of the Queue Worker PoC system, explaining how each component works together to demonstrate task processing concepts and patterns. This is a proof-of-concept for learning and evaluation purposes.

## System Architecture

### High-Level Architecture

The system follows a microservices-inspired architecture with clear separation of concerns and optimized worker patterns. The current implementation demonstrates the worker patterns and workflow orchestration within a single application for PoC purposes. However, **RabbitMQ microservice transport requires separate microservice applications** - a single application cannot act as both server and client simultaneously.

**Note**: This PoC demonstrates concepts and patterns. For production use, workers must be implemented as separate microservices to properly utilize RabbitMQ transport.

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │   Task      │ │   Queue     │ │  Scheduler  │ │   Health    │ │
│  │ Controller  │ │  Manager    │ │ Controller  │ │ Controller  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │   Task      │ │   Queue     │ │  Scheduler  │ │   Fault     │ │
│  │  Service    │ │  Manager    │ │  Service    │ │  Service    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Messaging Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Messaging Service (RabbitMQ)                   │ │
│  │  ┌─────────────────┐ ┌─────────────────┐                    │ │
│  │  │ MessagePattern  │ │  EventPattern   │                    │ │
│  │  │ (Quick Tasks)   │ │(Long-running)   │                    │ │
│  │  └─────────────────┘ └─────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Worker Layer                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │    HTTP     │ │    Data     │ │Compensation │ │   Base      │ │
│  │   Worker    │ │   Worker    │ │   Worker    │ │   Worker    │ │
│  │(MessagePattern)│(EventPattern)│(EventPattern)│             │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │   Fetch     │ │   Create    │ │  Generate   │ │   Send      │ │
│  │   Orders    │ │   Invoice   │ │    PDF      │ │   Email     │ │
│  │   Worker    │ │   Worker    │ │   Worker    │ │   Worker    │ │
│  │(EventPattern)│(EventPattern)│(EventPattern)│(EventPattern)│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │ │
│  │  │   Tasks     │ │   Workflows │ │   Task Logs │            │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Task Management System

#### Task Entity

```typescript
interface TaskEntity {
  id: string;
  type: TaskType; // HTTP_REQUEST | DATA_PROCESSING | COMPENSATION | FETCH_ORDERS | CREATE_INVOICE | GENERATE_PDF | SEND_EMAIL
  payload: Record<string, any>;
  status: TaskStatus; // PENDING | PROCESSING | COMPLETED | FAILED | RETRYING | CANCELLED
  retries: number;
  maxRetries: number;
  error?: string;
  scheduledAt?: Date;
  workflow?: WorkflowEntity;
  parentTask?: TaskEntity;
  children: TaskEntity[];
  logs: TaskLogEntity[];
}
```

#### Task Lifecycle

1. **Creation**: Task is created with PENDING status
2. **Queuing**: Task is published to RabbitMQ
3. **Processing**: Worker picks up task and sets status to PROCESSING
4. **Completion**: Task is marked as COMPLETED or FAILED
5. **Retry**: Failed tasks are retried with exponential backoff
6. **Compensation**: Failed workflows trigger compensation tasks

### 2. Worker System

#### Base Worker Architecture

```typescript
abstract class BaseWorker {
  // Common worker functionality
  async handleTask(data: ITaskMessage): Promise<void> {
    // 1. Validate task exists
    // 2. Check if worker should process this task type
    // 3. Apply delay if specified
    // 4. Update status to PROCESSING
    // 5. Execute task-specific logic
    // 6. Update status to COMPLETED
    // 7. Handle workflow coordination
    // 8. Handle errors and retries
  }

  protected abstract processTask(taskId: string): Promise<void>;
  protected abstract shouldProcessTaskType(taskType: TaskType): boolean;
}

// Pattern Usage:
// - @EventPattern: For all tasks with fire-and-forget semantics
```

#### Worker Types

**HTTP Worker** (EventPattern)

- Handles external API calls with immediate response requirements
- Supports all HTTP methods (GET, POST, PUT, DELETE)
- Configurable timeouts and retry policies
- Handles authentication and headers
- Uses EventPattern for fire-and-forget communication

**Data Processing Worker** (EventPattern)

- Processes data transformation tasks
- Supports batch operations with extended processing times
- Handles data validation and cleaning
- Manages large dataset processing
- Uses EventPattern for fire-and-forget communication

**Compensation Worker** (EventPattern)

- Implements saga pattern for distributed transactions
- Handles rollback operations with cleanup delays
- Ensures data consistency
- Manages partial failure recovery
- Uses EventPattern for asynchronous processing

**Fetch Orders Worker** (EventPattern)

- Fetches customer orders from external APIs
- Handles date range filtering and data processing
- Manages external service timeouts
- Uses EventPattern for asynchronous processing

**Create Invoice Worker** (EventPattern)

- Processes business logic for invoice creation
- Handles tax calculations and business rules
- Manages complex data transformations
- Uses EventPattern for asynchronous processing

**Generate PDF Worker** (EventPattern)

- Generates PDF documents via external services
- Handles large document processing
- Manages external service timeouts
- Uses EventPattern for asynchronous processing

**Send Email Worker** (EventPattern)

- Sends emails via external email services
- Handles email template processing
- Manages external service timeouts
- Uses EventPattern for asynchronous processing

### 3. Messaging System

#### RabbitMQ Configuration

The system uses RabbitMQ microservice transport for messaging between services. **Important limitation**: RabbitMQ microservice transport requires separate microservice applications - a single application cannot act as both server and client simultaneously.

**Current Implementation**: Demonstrates worker patterns and workflow orchestration within a single application for PoC and learning purposes.

**Production Considerations**: Workers must be implemented as separate microservices to properly utilize RabbitMQ transport.

```typescript
interface RabbitMQConfig {
  transport: Transport.RMQ;
  options: {
    urls: string[];
    queue: string;
    queueOptions: {
      durable: boolean;
      deadLetterExchange: string;
      deadLetterRoutingKey: string;
    };
  };
}
```

#### Message Patterns

All tasks use EventPattern for fire-and-forget messaging:

- **http.request**: HTTP API call tasks
- **data.processing**: Data transformation tasks
- **compensation**: Rollback and cleanup tasks
- **fetch.orders**: External API calls to fetch customer orders
- **create.invoice**: Business logic for invoice creation
- **generate.pdf**: PDF generation via external services
- **send.email**: Email sending via external services
- **task.created**: Default fallback pattern

#### Message Structure

```typescript
interface ITaskMessage {
  taskType: string;
  taskId: string;
  delay?: number;
  metadata?: Record<string, any>;
}
```

### 4. Workflow Coordination

#### Workflow Definition

```typescript
interface WorkflowEntity {
  id: string;
  name: string;
  definition: {
    initialTask: {
      type: TaskType;
      payload: Record<string, any>;
    };
    transitions: Record<
      string,
      {
        type: TaskType;
        payload: Record<string, any>;
      }
    >;
  };
  isActive: boolean;
  tasks: TaskEntity[];
}
```

#### Coordinator Service

The coordinator manages workflow execution:

1. **Workflow Start**: Creates initial task and publishes to queue
2. **Task Completion**: Handles task completion and creates next tasks
3. **Task Failure**: Manages failure scenarios and compensation
4. **Transition Logic**: Determines next steps based on workflow definition

### 5. Fault Handling

#### Retry Mechanism

```typescript
// Exponential backoff with maximum delay
const delay = Math.min(30000, 2000 * task.retries);
```

#### Compensation Strategy

1. **Saga Pattern**: Distributed transaction management
2. **Rollback Operations**: Automatic cleanup on failures
3. **Data Consistency**: Ensures system integrity
4. **Partial Failure Recovery**: Handles partial workflow failures

## Data Flow

### Task Creation Flow

```
1. HTTP Request → Task Controller
2. Task Controller → Task Service
3. Task Service → Task Repository (Database)
4. Task Service → Messaging Service
5. Messaging Service → RabbitMQ
6. RabbitMQ → Worker (via message pattern)
7. Worker → Task Processing
8. Worker → Task Service (Status Update)
9. Worker → Coordinator (Workflow Management)
```

### Task Processing Flow

```
1. Worker receives message from RabbitMQ
2. Worker validates task exists and is processable
3. Worker updates task status to PROCESSING
4. Worker executes task-specific logic
5. Worker updates task status to COMPLETED/FAILED
6. Worker triggers workflow coordination
7. Coordinator creates next tasks if needed
8. Coordinator handles failures and compensation
```

### Error Handling Flow

```
1. Task fails during processing
2. Worker catches error and logs details
3. Worker calls TaskService.handleFailure()
4. TaskService increments retry count
5. TaskService determines new status (PENDING/FAILED)
6. If PENDING: Task is republished to queue with delay
7. If FAILED: Compensation is triggered
8. Coordinator handles workflow-level error management
```

## Scalability Design

### Horizontal Scaling

- **Multiple Worker Instances**: Deploy multiple instances of each worker type as separate microservices
- **Queue Partitioning**: Distribute load across multiple queues
- **Database Scaling**: Read replicas and connection pooling
- **Message Broker Scaling**: RabbitMQ clustering support

### Microservice Architecture Requirements

**RabbitMQ Transport Limitation**: NestJS RabbitMQ microservice transport requires separate applications for client and server roles. A single application cannot act as both simultaneously.

**Conceptual Production Architecture** (for reference):

- **API Service**: Handles HTTP requests, task creation, and workflow orchestration
- **Worker Services**: Separate microservices for each worker type (HTTP, Data, Compensation, Invoice, etc.)
- **Shared Database**: PostgreSQL for task state and workflow definitions
- **Message Broker**: RabbitMQ for inter-service communication

### Performance Optimization

- **Connection Pooling**: Efficient database connections
- **Message Batching**: Batch processing capabilities
- **Async Processing**: Non-blocking task execution

### Load Balancing

- **RabbitMQ Load Balancing**: Automatic message distribution
- **Worker Load Distribution**: Round-robin task assignment
- **Database Load Distribution**: Connection pooling and read replicas

## Security Considerations

### Input Validation

- **Request Validation**: Comprehensive input validation using class-validator
- **Payload Validation**: Task payload validation and sanitization
- **Type Safety**: TypeScript ensures type safety throughout the system

### Data Protection

- **Encryption**: TLS/SSL encryption for data in transit
- **Secure Configuration**: Environment-based configuration management
- **Audit Logging**: Comprehensive audit trail for all operations

## Monitoring & Observability

### Health Checks

- **Application Health**: `/api/health` endpoint with dependency checks
- **Queue Health**: Queue status and overload detection
- **Database Health**: Connection and query performance monitoring
- **Message Broker Health**: RabbitMQ connectivity and performance

### Logging Strategy

- **Structured Logging**: Winston-based JSON logging
- **Task Logs**: Per-task execution logs with different levels
- **Audit Trail**: Complete task lifecycle tracking
- **Error Tracking**: Detailed error information and stack traces

### Metrics Collection

- **Queue Metrics**: Pending, processing, completed, failed counts
- **Performance Metrics**: Task execution times and throughput
- **Error Rates**: Failure rates and retry statistics
- **System Health**: Overall system health indicators

## Testing Strategy

### Test Types

- **Unit Tests**: Individual component testing with mocks
- **Integration Tests**: End-to-end workflow testing
- **E2E Tests**: Complete system testing
- **Performance Tests**: Load and stress testing

### Test Coverage

- **Service Layer**: All business logic covered
- **Controller Layer**: All API endpoints tested
- **Worker Layer**: All worker types tested
- **Integration Layer**: Database and messaging integration tested

### Mock Strategy

- **Repository Mocks**: Database interaction mocking
- **Service Mocks**: External service mocking
- **Message Mocks**: RabbitMQ message mocking
- **Factory Pattern**: Test data generation

## Deployment Architecture

### Container Strategy

- **Multi-stage Builds**: Optimized production images
- **Health Checks**: Container health monitoring
- **Environment Separation**: Dev/prod configurations
- **Volume Management**: Persistent data storage

### Cloud Deployment

- **Kubernetes Ready**: Container orchestration support
- **Environment Variables**: Cloud-native configuration
- **Secrets Management**: Secure credential handling
- **Auto-scaling**: Horizontal pod autoscaling support

### Infrastructure as Code

- **Docker Compose**: Local development environment
- **Kubernetes Manifests**: Production deployment ready
- **Environment Configuration**: Environment-specific configs
- **CI/CD Pipeline**: Automated deployment pipeline

## Performance Characteristics

### Throughput (PoC Estimates)

- **Task Processing**: Demonstrates task processing patterns (not optimized for production)
- **Concurrent Workers**: Shows worker scaling concepts
- **Database Operations**: Basic query patterns and indexing
- **Message Processing**: RabbitMQ message handling patterns
- **Pattern Optimization**: EventPattern usage for task processing

### Pattern Performance Benefits

- **EventPattern**: Optimized for all tasks with fire-and-forget semantics
- **Queue Efficiency**: Consistent messaging pattern across all task types
- **Scalability**: Better resource utilization through unified pattern approach

### Latency (PoC Estimates)

- **Task Creation**: Demonstrates task creation patterns
- **Task Processing**: Shows processing time concepts
- **Database Queries**: Basic query performance patterns
- **Message Publishing**: RabbitMQ publishing patterns

### Reliability (PoC Concepts)

- **Task Durability**: Demonstrates task persistence patterns
- **Data Consistency**: Shows basic ACID compliance concepts
- **Fault Tolerance**: Illustrates error handling and retry patterns
- **High Availability**: Shows availability concepts (not production-ready)

## Conclusion

This Queue Worker PoC demonstrates task processing concepts and patterns for learning and evaluation purposes. The architecture showcases:

- **Scalability Concepts**: Worker patterns and scaling approaches
- **Reliability Patterns**: Error handling and retry mechanisms
- **Maintainability**: Clear separation of concerns and pattern-based architecture
- **Observability**: Basic monitoring and logging patterns
- **Security Concepts**: Input validation and configuration management patterns
- **Performance Patterns**: Task processing and messaging patterns
- **Pattern Optimization**: Consistent use of EventPattern for all tasks

The system uses EventPattern for all tasks, providing consistent fire-and-forget messaging semantics. The current implementation demonstrates the patterns within a single application, but production deployment requires separate microservices to properly utilize RabbitMQ transport.

**Note**: This PoC is designed for learning and evaluation purposes. It demonstrates concepts and patterns but is not intended for production use without significant modifications and additional features.
