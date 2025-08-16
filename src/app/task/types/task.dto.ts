import { TaskType } from './task-type.enum';
import { TaskStatus } from './task-status.enum';

export class CreateTaskDto {
  type: TaskType;
  payload: Record<string, any>;
  workflowId?: string;
}

export class TaskFiltersDto {
  status?: TaskStatus;
  type?: TaskType;
  workflowId?: string;
}

export class TaskResponseDto {
  id: string;
  type: TaskType;
  status: TaskStatus;
  payload: Record<string, any>;
  retries: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
