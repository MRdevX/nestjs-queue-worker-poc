import { TaskType } from '@root/app/task/types/task-type.enum';
import { TaskStatus } from '@root/app/task/types/task-status.enum';
import { TaskEntityMockFactory } from './task-entity.mock';

export class TaskServiceMockFactory {
  static create() {
    return {
      createTask: jest.fn(),
      getTaskById: jest.fn(),
      findTasks: jest.fn(),
      updateTaskStatus: jest.fn(),
      handleFailure: jest.fn(),
      getPendingTasks: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    mock.createTask.mockImplementation(
      (type: TaskType, payload: any, workflowId?: string) => {
        return Promise.resolve(
          TaskEntityMockFactory.create({
            type,
            payload,
            status: TaskStatus.PENDING,
            workflow: workflowId ? ({ id: workflowId } as any) : undefined,
          }),
        );
      },
    );

    mock.getTaskById.mockResolvedValue(null);
    mock.findTasks.mockResolvedValue([]);
    mock.updateTaskStatus.mockResolvedValue(null);
    mock.handleFailure.mockResolvedValue(undefined);
    mock.getPendingTasks.mockResolvedValue([]);

    return mock;
  }
}

export class MessagingServiceMockFactory {
  static create() {
    return {
      publishTask: jest.fn(),
      sendMessage: jest.fn(),
      emitEvent: jest.fn(),
      getClient: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    mock.publishTask.mockResolvedValue(undefined);
    mock.sendMessage.mockResolvedValue(undefined);
    mock.emitEvent.mockResolvedValue(undefined);
    mock.getClient.mockReturnValue({});
    mock.connect.mockResolvedValue(undefined);
    mock.close.mockResolvedValue(undefined);

    return mock;
  }
}

export class SchedulerServiceMockFactory {
  static create() {
    return {
      createScheduledTask: jest.fn(),
      createRecurringTask: jest.fn(),
      getScheduledTasks: jest.fn(),
      processScheduledTasks: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    mock.createScheduledTask.mockImplementation(
      (
        type: TaskType,
        payload: any,
        scheduledAt: Date,
        workflowId?: string,
      ) => {
        return Promise.resolve(
          TaskEntityMockFactory.create({
            type,
            payload,
            status: TaskStatus.PENDING,
            scheduledAt,
            workflow: workflowId ? ({ id: workflowId } as any) : undefined,
          }),
        );
      },
    );

    mock.createRecurringTask.mockImplementation(
      (
        type: TaskType,
        payload: any,
        cronExpression: string,
        workflowId?: string,
      ) => {
        return Promise.resolve(
          TaskEntityMockFactory.create({
            type,
            payload: { ...payload, cronExpression, isRecurring: true },
            status: TaskStatus.PENDING,
            workflow: workflowId ? ({ id: workflowId } as any) : undefined,
          }),
        );
      },
    );

    mock.getScheduledTasks.mockResolvedValue([]);
    mock.processScheduledTasks.mockResolvedValue(undefined);

    return mock;
  }
}

export class ConfigServiceMockFactory {
  static create(config: Record<string, any> = {}) {
    const defaultConfig = {
      'invoice.pdfProcessor.url': 'https://mock-pdf-processor.com/generate',
      'invoice.emailService.url': 'https://mock-email-service.com/send',
      'invoice.pdfProcessor.timeout': 30000,
      'invoice.emailService.timeout': 30000,
      'invoice.workflow.maxConcurrentTasks': 10,
      'invoice.workflow.defaultRetryAttempts': 3,
      'invoice.workflow.taskTimeout': 300000,
      'invoice.scheduling.defaultCronExpression': '0 0 * * *',
      'invoice.scheduling.maxScheduledTasks': 100,
      ...config,
    };

    return {
      get: jest.fn((key: string) => defaultConfig[key]),
    };
  }
}

export class InvoiceServiceMockFactory {
  static create() {
    return {
      startInvoiceWorkflow: jest.fn(),
      createScheduledInvoiceWorkflow: jest.fn(),
      createRecurringInvoiceWorkflow: jest.fn(),
      createScheduledEmailWorkflow: jest.fn(),
      getCustomerInvoiceTasks: jest.fn(),
      getInvoiceWorkflowStatus: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    mock.startInvoiceWorkflow.mockResolvedValue({
      message: 'Invoice workflow started',
      taskId: 'task-123',
      workflowId: undefined,
    });

    mock.createScheduledInvoiceWorkflow.mockResolvedValue({
      message: 'Scheduled invoice workflow created',
      taskId: 'task-123',
      scheduledAt: new Date().toISOString(),
      workflowId: undefined,
    });

    mock.createRecurringInvoiceWorkflow.mockResolvedValue({
      message: 'Recurring invoice workflow created',
      taskId: 'task-123',
      cronExpression: '0 0 * * *',
      workflowId: undefined,
    });

    mock.createScheduledEmailWorkflow.mockResolvedValue({
      message: 'Scheduled email workflow created',
      taskId: 'task-123',
      scheduledAt: new Date().toISOString(),
      workflowId: undefined,
    });

    mock.getCustomerInvoiceTasks.mockResolvedValue({
      customerId: 'customer-123',
      tasks: [],
    });

    mock.getInvoiceWorkflowStatus.mockResolvedValue({
      customerId: 'customer-123',
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      pendingTasks: 0,
      processingTasks: 0,
      workflows: {},
    });

    return mock;
  }
}
