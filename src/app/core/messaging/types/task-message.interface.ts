export interface ITaskMessage {
  taskType: string;
  taskId: string;
  delay?: number;
  metadata?: Record<string, any>;
}
