import { TaskType } from '../../task/types/task-type.enum';

export interface ICreateScheduledTask {
  type: TaskType;
  payload: any;
  scheduledAt: string;
  workflowId?: string;
}
