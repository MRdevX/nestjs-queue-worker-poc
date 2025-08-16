import { TaskType } from '../../../task/types/task-type.enum';

export const EVENT_PATTERNS = {
  [TaskType.HTTP_REQUEST]: 'http.request',
  [TaskType.DATA_PROCESSING]: 'data.processing',
  [TaskType.COMPENSATION]: 'compensation',
  [TaskType.FETCH_ORDERS]: 'fetch.orders',
  [TaskType.CREATE_INVOICE]: 'create.invoice',
  [TaskType.GENERATE_PDF]: 'generate.pdf',
  [TaskType.SEND_EMAIL]: 'send.email',
} as const;

export const DEFAULT_EVENT_PATTERN = 'task.created';

export const getEventPattern = (taskType: TaskType): string => {
  return EVENT_PATTERNS[taskType] || DEFAULT_EVENT_PATTERN;
};
