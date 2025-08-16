import { TaskService } from '../../src/app/task/task.service';
import { TaskType } from '../../src/app/task/types/task-type.enum';
import { TaskStatus } from '../../src/app/task/types/task-status.enum';
import { TaskEntity } from '../../src/app/task/task.entity';

export class InvoiceWorkflowHelper {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Creates a complete invoice workflow chain for testing
   */
  async createCompleteWorkflowChain(customerId: string, workflowId?: string) {
    console.log(
      `🔧 Creating complete workflow chain for customer: ${customerId}`,
    );

    const fetchOrdersTask = await this.taskService.createTask(
      TaskType.FETCH_ORDERS,
      {
        customerId,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      },
      workflowId,
    );

    await this.taskService.updateTaskPayload(fetchOrdersTask.id, {
      ...fetchOrdersTask.payload,
      orders: [
        {
          id: 'order-1',
          customerId,
          status: 'delivered',
          items: [{ id: 'item-1', name: 'Product A', price: 100, quantity: 2 }],
          totalAmount: 200,
        },
      ],
    });
    await this.taskService.updateTaskStatus(
      fetchOrdersTask.id,
      TaskStatus.COMPLETED,
    );

    const createInvoiceTask = await this.taskService.createTask(
      TaskType.CREATE_INVOICE,
      {
        customerId,
        orders: [
          {
            id: 'order-1',
            customerId,
            status: 'delivered',
            items: [
              { id: 'item-1', name: 'Product A', price: 100, quantity: 2 },
            ],
            totalAmount: 200,
          },
        ],
      },
      workflowId,
    );

    await this.taskService.updateTaskPayload(createInvoiceTask.id, {
      ...createInvoiceTask.payload,
      invoice: {
        id: 'invoice-1',
        customerId,
        totalAmount: 200,
        grandTotal: 220,
      },
    });
    await this.taskService.updateTaskStatus(
      createInvoiceTask.id,
      TaskStatus.COMPLETED,
    );

    const generatePdfTask = await this.taskService.createTask(
      TaskType.GENERATE_PDF,
      {
        customerId,
        invoice: {
          id: 'invoice-1',
          customerId,
          totalAmount: 200,
          grandTotal: 220,
        },
      },
      workflowId,
    );

    await this.taskService.updateTaskPayload(generatePdfTask.id, {
      ...generatePdfTask.payload,
      pdfUrl: 'https://storage.example.com/invoice-1.pdf',
    });
    await this.taskService.updateTaskStatus(
      generatePdfTask.id,
      TaskStatus.COMPLETED,
    );

    const sendEmailTask = await this.taskService.createTask(
      TaskType.SEND_EMAIL,
      {
        customerId,
        invoice: {
          id: 'invoice-1',
          customerId,
          totalAmount: 200,
          grandTotal: 220,
        },
        pdfUrl: 'https://storage.example.com/invoice-1.pdf',
      },
      workflowId,
    );

    console.log(`✅ Complete workflow chain created with ${4} tasks`);

    return {
      fetchOrdersTask,
      createInvoiceTask,
      generatePdfTask,
      sendEmailTask,
    };
  }

  /**
   * Creates tasks with different statuses for testing
   */
  async createTasksWithDifferentStatuses(customerId: string) {
    console.log(
      `🔧 Creating tasks with different statuses for customer: ${customerId}`,
    );

    const tasks: TaskEntity[] = [];

    const completedTask = await this.taskService.createTask(
      TaskType.FETCH_ORDERS,
      {
        customerId,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      },
    );
    await this.taskService.updateTaskStatus(
      completedTask.id,
      TaskStatus.COMPLETED,
    );
    tasks.push(completedTask);

    const failedTask = await this.taskService.createTask(
      TaskType.CREATE_INVOICE,
      {
        customerId,
        orders: [],
      },
    );
    await this.taskService.updateTaskStatus(failedTask.id, TaskStatus.FAILED);
    tasks.push(failedTask);

    const pendingTask = await this.taskService.createTask(
      TaskType.GENERATE_PDF,
      {
        customerId,
        invoice: {},
      },
    );
    tasks.push(pendingTask);

    const processingTask = await this.taskService.createTask(
      TaskType.SEND_EMAIL,
      {
        customerId,
        invoice: {},
        pdfUrl: 'https://example.com/invoice.pdf',
      },
    );
    await this.taskService.updateTaskStatus(
      processingTask.id,
      TaskStatus.PROCESSING,
    );
    tasks.push(processingTask);

    console.log(`✅ Created ${tasks.length} tasks with different statuses`);
    return tasks;
  }

  /**
   * Waits for a task to reach a specific status
   */
  async waitForTaskStatus(
    taskId: string,
    expectedStatus: TaskStatus,
    timeoutMs: number = 5000,
  ): Promise<boolean> {
    console.log(
      `⏳ Waiting for task ${taskId} to reach status: ${expectedStatus}`,
    );

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const task = await this.taskService.getTaskById(taskId);
        if (task && task.status === expectedStatus) {
          console.log(
            `✅ Task ${taskId} reached expected status: ${expectedStatus}`,
          );
          return true;
        }
      } catch (error) {
        console.log(`⚠️ Error checking task status: ${error.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `❌ Timeout waiting for task ${taskId} to reach status: ${expectedStatus}`,
    );
    return false;
  }

  /**
   * Validates workflow response structure
   */
  validateWorkflowResponse(response: any, expectedMessage: string) {
    expect(response).toMatchObject({
      message: expectedMessage,
      taskId: expect.any(String),
    });

    if (response.workflowId) {
      expect(response.workflowId).toBeDefined();
    }

    if (response.scheduledAt) {
      expect(response.scheduledAt).toBeDefined();
    }

    if (response.cronExpression) {
      expect(response.cronExpression).toBeDefined();
    }
  }

  /**
   * Validates task structure
   */
  validateTaskStructure(
    task: any,
    expectedType: TaskType,
    expectedCustomerId: string,
  ) {
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.type).toBe(expectedType);
    expect(task.payload.customerId).toBe(expectedCustomerId);
    expect(task.createdAt).toBeDefined();
    expect(task.updatedAt).toBeDefined();
  }

  /**
   * Logs task details in a formatted way
   */
  logTaskDetails(task: any, prefix: string = '') {
    console.log(`${prefix}📊 Task Details:`, {
      id: task.id,
      type: task.type,
      status: task.status,
      customerId: task.payload.customerId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });
  }

  /**
   * Logs workflow status in a formatted way
   */
  logWorkflowStatus(status: any, prefix: string = '') {
    console.log(`${prefix}📊 Workflow Status:`, {
      customerId: status.customerId,
      totalTasks: status.totalTasks,
      completedTasks: status.completedTasks,
      failedTasks: status.failedTasks,
      pendingTasks: status.pendingTasks,
      processingTasks: status.processingTasks,
      workflowsCount: Object.keys(status.workflows || {}).length,
    });
  }
}
