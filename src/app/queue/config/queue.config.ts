import { TaskType } from '../../task/types/task-type.enum';

export const WORKER_CONFIGS = {
  [TaskType.HTTP_REQUEST]: 'http.worker',
  [TaskType.DATA_PROCESSING]: 'data.worker',
  [TaskType.FETCH_ORDERS]: 'fetch-orders.worker',
  [TaskType.CREATE_INVOICE]: 'create-invoice.worker',
  [TaskType.GENERATE_PDF]: 'generate-pdf.worker',
  [TaskType.SEND_EMAIL]: 'send-email.worker',
  [TaskType.COMPENSATION]: 'compensation.worker',
} as const;

export const getWorkerForTaskType = (taskType: TaskType): string => {
  return WORKER_CONFIGS[taskType] || 'data.worker';
};
