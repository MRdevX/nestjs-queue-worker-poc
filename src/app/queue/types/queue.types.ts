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
