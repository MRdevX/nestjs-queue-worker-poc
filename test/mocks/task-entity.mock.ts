import { faker } from '@faker-js/faker';
import { TaskEntity } from '@root/app/task/task.entity';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { TaskStatus } from '@root/app/task/types/task-status.enum';
import { IBaseEntityMockData } from './base-entity.mock';

export interface ITaskEntityMockData extends IBaseEntityMockData {
  type?: TaskType;
  payload?: Record<string, any>;
  status?: TaskStatus;
  retries?: number;
  maxRetries?: number;
  error?: string | null;
  scheduledAt?: Date | null;
  workflow?: any;
  parentTask?: any;
  children?: any[];
  logs?: any[];
}

export class TaskEntityMockFactory {
  static create(data: ITaskEntityMockData = {}): Partial<TaskEntity> {
    return {
      id: data.id || faker.string.uuid(),
      createdAt: data.createdAt || faker.date.past(),
      updatedAt: data.updatedAt || faker.date.recent(),
      deletedAt: data.deletedAt || undefined,
      type: data.type || faker.helpers.enumValue(TaskType),
      payload: data.payload || this.generateTaskPayload(),
      status: data.status || faker.helpers.enumValue(TaskStatus),
      retries: data.retries ?? faker.number.int({ min: 0, max: 5 }),
      maxRetries: data.maxRetries ?? faker.number.int({ min: 1, max: 10 }),
      error:
        data.error ??
        (data.status === TaskStatus.FAILED
          ? faker.lorem.sentence()
          : undefined),
      scheduledAt:
        data.scheduledAt ??
        (faker.datatype.boolean() ? faker.date.future() : undefined),
      workflow: data.workflow || null,
      parentTask: data.parentTask || null,
      children: data.children || [],
      logs: data.logs || [],
    };
  }

  static createArray(
    count: number = 3,
    data: ITaskEntityMockData = {},
  ): Partial<TaskEntity>[] {
    return Array.from({ length: count }, () => this.create(data));
  }

  static createWithStatus(
    status: TaskStatus,
    data: ITaskEntityMockData = {},
  ): Partial<TaskEntity> {
    return this.create({ ...data, status });
  }

  static createWithType(
    type: TaskType,
    data: ITaskEntityMockData = {},
  ): Partial<TaskEntity> {
    return this.create({ ...data, type });
  }

  static createFailed(data: ITaskEntityMockData = {}): Partial<TaskEntity> {
    return this.create({
      ...data,
      status: TaskStatus.FAILED,
      error: data.error || faker.lorem.sentence(),
      retries: data.retries ?? faker.number.int({ min: 1, max: 5 }),
    });
  }

  static createPending(data: ITaskEntityMockData = {}): Partial<TaskEntity> {
    return this.create({
      ...data,
      status: TaskStatus.PENDING,
      error: null,
      retries: 0,
    });
  }

  static createProcessing(data: ITaskEntityMockData = {}): Partial<TaskEntity> {
    return this.create({
      ...data,
      status: TaskStatus.PROCESSING,
      error: null,
    });
  }

  static createCompleted(data: ITaskEntityMockData = {}): Partial<TaskEntity> {
    return this.create({
      ...data,
      status: TaskStatus.COMPLETED,
      error: null,
    });
  }

  private static generateTaskPayload(): Record<string, any> {
    const taskType = faker.helpers.enumValue(TaskType);

    switch (taskType) {
      case TaskType.HTTP_REQUEST:
        return {
          url: faker.internet.url(),
          method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
          headers: { 'Content-Type': 'application/json' },
          body: { data: faker.lorem.word() },
        };
      case TaskType.DATA_PROCESSING:
        return {
          source: faker.lorem.word(),
          transformation: faker.lorem.word(),
          output: faker.lorem.word(),
        };
      case TaskType.COMPENSATION:
        return {
          originalTaskId: faker.string.uuid(),
          reason: faker.lorem.sentence(),
        };
      default:
        return {
          data: faker.lorem.word(),
        };
    }
  }
}
