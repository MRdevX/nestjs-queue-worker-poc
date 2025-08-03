import { TaskType } from '../../task/types/task-type.enum';

export interface IWorkerConfig {
  readonly taskType: TaskType;
  readonly workerName: string;
  readonly queueName: string;
}
