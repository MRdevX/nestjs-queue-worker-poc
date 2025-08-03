import { faker } from '@faker-js/faker';
import {
  WorkflowEntity,
  WorkflowStatus,
} from '@root/app/workflow/workflow.entity';
import { TaskType } from '@root/app/task/types/task-type.enum';
import { IBaseEntityMockData } from './base-entity.mock';

export interface IWorkflowEntityMockData extends IBaseEntityMockData {
  name?: string;
  isActive?: boolean;
  status?: WorkflowStatus;
  error?: string;
  tasks?: any[];
  definition?: {
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
}

export class WorkflowEntityMockFactory {
  static create(data: IWorkflowEntityMockData = {}): Partial<WorkflowEntity> {
    return {
      id: data.id || faker.string.uuid(),
      createdAt: data.createdAt || faker.date.past(),
      updatedAt: data.updatedAt || faker.date.recent(),
      deletedAt: data.deletedAt || undefined,
      name: data.name || faker.lorem.words(3),
      isActive: data.isActive ?? faker.datatype.boolean(),
      status: data.status || WorkflowStatus.PENDING,
      error: data.error || undefined,
      tasks: data.tasks || [],
      definition: data.definition || {
        initialTask: {
          type: TaskType.HTTP_REQUEST,
          payload: { url: faker.internet.url() },
        },
        transitions: {},
      },
    };
  }

  static createArray(
    count: number = 3,
    data: IWorkflowEntityMockData = {},
  ): Partial<WorkflowEntity>[] {
    return Array.from({ length: count }, () => this.create(data));
  }

  static createActive(
    data: IWorkflowEntityMockData = {},
  ): Partial<WorkflowEntity> {
    return this.create({ ...data, isActive: true });
  }

  static createInactive(
    data: IWorkflowEntityMockData = {},
  ): Partial<WorkflowEntity> {
    return this.create({ ...data, isActive: false });
  }
}
