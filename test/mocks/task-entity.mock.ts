import { TaskEntity } from '../../src/app/task/task.entity';
import { TaskType } from '../../src/app/task/types/task-type.enum';
import { TaskStatus } from '../../src/app/task/types/task-status.enum';
import { BaseEntityMockFactory } from './base-entity.mock';

export class TaskEntityMockFactory {
  static create(data: Partial<TaskEntity> = {}): TaskEntity {
    return {
      ...BaseEntityMockFactory.create(),
      type: data.type || TaskType.HTTP_REQUEST,
      payload: data.payload || { url: 'https://api.example.com' },
      status: data.status || TaskStatus.PENDING,
      retries: data.retries || 0,
      maxRetries: data.maxRetries || 3,
      error: data.error || null,
      workflow: data.workflow || null,
      logs: data.logs || [],
      scheduledAt: data.scheduledAt || null,
    } as TaskEntity;
  }

  static createArray(count: number, data: Partial<TaskEntity> = {}): TaskEntity[] {
    return Array.from({ length: count }, () => this.create(data));
  }

  static createWithWorkflow(workflowId: string, data: Partial<TaskEntity> = {}): TaskEntity {
    return this.create({
      ...data,
      workflow: { id: workflowId } as any,
    });
  }

  static createWithLogs(logs: any[], data: Partial<TaskEntity> = {}): TaskEntity {
    return this.create({
      ...data,
      logs,
    });
  }

  static createCompleted(data: Partial<TaskEntity> = {}): TaskEntity {
    return this.create({
      ...data,
      status: TaskStatus.COMPLETED,
    });
  }

  static createFailed(data: Partial<TaskEntity> = {}): TaskEntity {
    return this.create({
      ...data,
      status: TaskStatus.FAILED,
      error: data.error || 'Task failed',
    });
  }

  static createProcessing(data: Partial<TaskEntity> = {}): TaskEntity {
    return this.create({
      ...data,
      status: TaskStatus.PROCESSING,
    });
  }
}
