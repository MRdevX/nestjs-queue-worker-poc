export interface ITaskMessage {
  taskId: string;
  taskType?: string;
  delay?: number;
  metadata?: Record<string, any>;
  retryCount?: number;
  originalTaskId?: string;
  workflowId?: string;
  scheduledAt?: string;
}
