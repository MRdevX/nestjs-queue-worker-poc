import { TaskType } from '../../task/types/task-type.enum';

export interface ICreateRecurringTask {
  type: TaskType;
  payload: any;
  cronExpression: string;
  workflowId?: string;
}
