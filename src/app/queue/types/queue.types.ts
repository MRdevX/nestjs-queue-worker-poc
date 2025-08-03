import { TaskType } from '../../task/types/task-type.enum';

export interface IEnqueueTaskDto {
  type: TaskType;
  payload: any;
  workflowId?: string;
}

export interface IQueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  isHealthy: boolean;
}

export const QUEUE_CONSTANTS = {
  MAX_RETRIES: 3,
  MAX_FAILED_TASKS: 50,
  MAX_PENDING_TASKS: 500,
} as const;
