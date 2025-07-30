export interface IQueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  isHealthy: boolean;
}
