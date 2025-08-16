import { TaskType } from '../../task/types/task-type.enum';

export const WORKER_CONFIGS = {
  [TaskType.HTTP_REQUEST]: 'unified.worker',
  [TaskType.DATA_PROCESSING]: 'unified.worker',
  [TaskType.FETCH_ORDERS]: 'unified.worker',
  [TaskType.CREATE_INVOICE]: 'unified.worker',
  [TaskType.GENERATE_PDF]: 'unified.worker',
  [TaskType.SEND_EMAIL]: 'unified.worker',
  [TaskType.COMPENSATION]: 'unified.worker',
} as const;

export const getWorkerForTaskType = (taskType: TaskType): string =>
  WORKER_CONFIGS[taskType] || 'unified.worker';
