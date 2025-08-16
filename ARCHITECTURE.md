# Architecture Overview

## System Components

### Core Infrastructure

- **CoreModule**: Global configuration, database connection, and shared services
- **MessagingModule**: Multi-provider messaging system (RabbitMQ, NATS, Redis)
- **HealthModule**: Application health monitoring
- **SeederModule**: Database seeding and testing utilities

### Task Processing

- **TaskModule**: Task CRUD operations, status management, and persistence
- **WorkerModule**: Task execution engine with unified worker pattern
- **QueueModule**: Queue management, load balancing, and monitoring
- **SchedulerModule**: Task scheduling (one-time and recurring)

### Business Logic

- **WorkflowModule**: Workflow definition and orchestration
- **InvoiceModule**: Complete invoice processing workflow

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
├─────────────────────────────────────────────────────────────┤
│  Controllers: Task, Queue, Scheduler, Invoice, Workflow    │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  TaskService    │  QueueService   │  SchedulerService      │
│  WorkerService  │  WorkflowService│  InvoiceService        │
├─────────────────────────────────────────────────────────────┤
│                    Messaging Layer                          │
├─────────────────────────────────────────────────────────────┤
│  MessagingService (Factory Pattern)                        │
│  ├─ RabbitMQProvider                                       │
│  ├─ NatsProvider                                           │
│  └─ RedisProvider                                          │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL: Tasks, Workflows, TaskLogs                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Factory Pattern (Messaging)

- Abstract `BaseProvider` interface
- Concrete implementations for each message broker
- `MessagingFactoryService` for provider instantiation

### 2. Unified Worker Pattern

- Single worker handles all task types
- EventPattern for fire-and-forget semantics
- Automatic retry and compensation logic

### 3. Workflow Orchestration

- Workflow definitions stored in database
- Task dependency management
- Status tracking and error handling

### 4. Multi-Provider Support

- Configurable message broker selection
- Consistent API across providers
- Environment-specific configurations

## Data Flow

1. **Task Creation**: API → TaskService → Database + Queue
2. **Task Processing**: Queue → Worker → TaskProcessor → External Services
3. **Workflow Execution**: InvoiceService → Multiple Tasks → Status Updates
4. **Scheduling**: SchedulerService → Cron Jobs → Task Creation

## Technology Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Message Brokers**: RabbitMQ, NATS, Redis
- **Testing**: Jest with comprehensive coverage
- **Containerization**: Docker with multi-stage builds
