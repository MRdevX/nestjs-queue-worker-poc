export interface ITaskMessage {
  taskType: string;
  taskId: string;
  delay?: number; // Optional delay in milliseconds
  metadata?: Record<string, any>; // Optional metadata for additional context
}
