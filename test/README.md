# End-to-End Tests for Queue Worker System

This directory contains comprehensive end-to-end tests that demonstrate the functionality of the queue/worker system PoC.

## Test Structure

### 1. `app.e2e-spec.ts` - Core System Tests

Tests the main system components and API endpoints:

- **Health Check**: Verifies system health endpoints
- **Task Management**: Tests task creation, retrieval, and lifecycle
- **Queue Management**: Tests queue status, monitoring, and overload detection
- **Task Scheduling**: Tests scheduled and recurring task creation
- **Task Retry and Compensation**: Tests retry mechanisms and compensation workflows
- **Queue Operations**: Tests queue-specific operations like retry and cancellation
- **System Integration**: Tests complete task lifecycle and concurrent processing

### 2. `worker-system.e2e-spec.ts` - Worker System Tests

Tests the worker nodes and task processing:

- **HTTP Worker**: Tests HTTP request processing, success/failure scenarios, and different HTTP methods
- **Data Processing Worker**: Tests data processing tasks with various operations
- **Compensation Worker**: Tests compensation task processing
- **Task Retry Mechanism**: Tests exponential backoff and retry limits
- **Task Logging**: Tests task execution logging
- **Concurrent Task Processing**: Tests system behavior under load
- **Task Priority and Ordering**: Tests task processing order

### 3. `workflow-scheduler.e2e-spec.ts` - Workflow and Scheduling Tests

Tests workflow management and scheduling functionality:

- **Task Scheduling**: Tests scheduled task creation and execution
- **Workflow Management**: Tests workflow creation and task dependencies
- **Scheduled Task Processing**: Tests multiple scheduled tasks and failure handling
- **Recurring Task Management**: Tests recurring task creation and management
- **Scheduler Integration**: Tests scheduler-worker integration and high load scenarios
- **Error Handling in Scheduling**: Tests scheduler error handling

### 4. `fault-tolerance.e2e-spec.ts` - Fault Tolerance Tests

Tests system resilience and error handling:

- **Retry Mechanisms**: Tests exponential backoff and retry limits
- **Compensation Mechanisms**: Tests compensation task creation and execution
- **Error Handling**: Tests network timeouts, malformed payloads, and service unavailability
- **Recovery Mechanisms**: Tests recovery from temporary failures and partial workflow failures
- **Monitoring and Alerting**: Tests failed task tracking and queue overload detection

## Prerequisites

Before running the e2e tests, ensure you have:

1. **PostgreSQL Database** running and accessible
2. **RabbitMQ** running and accessible
3. **Environment Variables** configured (see `.env.example`)

### Required Environment Variables for Testing

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=queue_worker_test
DB_SYNCHRONIZE=true

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE_NAME=test_queue

# Application
NODE_ENV=test
HOST=127.0.0.1
PORT=3030
```

## Running the Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Files

```bash
# Run only core system tests
npm run test:e2e -- --testNamePattern="Queue Worker System"

# Run only worker system tests
npm run test:e2e -- --testNamePattern="Worker System"

# Run only workflow and scheduler tests
npm run test:e2e -- --testNamePattern="Workflow and Scheduler"

# Run only fault tolerance tests
npm run test:e2e -- --testNamePattern="Fault Tolerance"
```

### Run Tests with Verbose Output

```bash
npm run test:e2e -- --verbose
```

### Run Tests with Coverage

```bash
npm run test:e2e -- --coverage
```

## Test Scenarios Demonstrated

### 1. Task Queuing System

- ✅ HTTP request triggered task creation
- ✅ Scheduled task creation and execution
- ✅ Recurring task management
- ✅ Task status tracking and monitoring

### 2. Task Execution

- ✅ HTTP API call execution
- ✅ Data processing job execution
- ✅ Compensation task execution
- ✅ Concurrent task processing

### 3. Task Monitoring and Logging

- ✅ Task status tracking (pending, processing, completed, failed)
- ✅ Execution logs and error details
- ✅ Queue status monitoring
- ✅ Performance metrics

### 4. Retry and Compensation Mechanisms

- ✅ Exponential backoff retry strategy
- ✅ Maximum retry limit enforcement
- ✅ Compensation task creation for failed tasks
- ✅ Partial failure handling

### 5. Scalability Features

- ✅ Horizontal scaling through multiple worker nodes
- ✅ Concurrent task processing
- ✅ Queue overload detection
- ✅ Load balancing across workers

## Test Data and External Services

### External Services Used

- **httpbin.org**: Used for HTTP request testing (GET, POST, status codes, delays)
- **Local PostgreSQL**: Database for task and workflow storage
- **Local RabbitMQ**: Message queue for task distribution

### Test Data Patterns

- **HTTP Tasks**: Various URLs, methods, and payloads
- **Data Processing Tasks**: Different sources, operations, and data structures
- **Compensation Tasks**: Rollback scenarios and error recovery
- **Scheduled Tasks**: Future execution times and recurring patterns

## Understanding Test Results

### Success Criteria

- All API endpoints return expected status codes
- Tasks are processed and status updated correctly
- Retry mechanisms work with exponential backoff
- Compensation tasks are created for failed tasks
- Queue monitoring provides accurate metrics
- System handles concurrent load gracefully

### Common Test Patterns

1. **Create → Wait → Verify**: Create task, wait for processing, verify status
2. **Fail → Retry → Compensate**: Create failing task, retry, trigger compensation
3. **Schedule → Execute**: Create scheduled task, wait for execution time
4. **Load → Monitor**: Create many tasks, monitor queue status

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check database credentials in environment variables
   - Verify database exists and is accessible

2. **RabbitMQ Connection Errors**
   - Ensure RabbitMQ is running
   - Check RabbitMQ credentials and connection settings
   - Verify queue permissions

3. **Test Timeouts**
   - Increase test timeout in `jest-e2e.json`
   - Check system resources (CPU, memory)
   - Verify external service availability

4. **Intermittent Failures**
   - Tests may fail due to timing issues with external services
   - Increase wait times in tests if needed
   - Check network connectivity to external services

### Debug Mode

Run tests with debug output:

```bash
npm run test:e2e -- --verbose --detectOpenHandles
```

## Performance Considerations

- Tests include realistic delays to simulate real-world processing
- Concurrent task creation tests system scalability
- Queue overload tests verify system behavior under stress
- External service calls are minimized to reduce test flakiness

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- Use test database and message queue instances
- Configure environment variables in CI
- Run tests in isolated containers
- Generate test reports and coverage metrics
