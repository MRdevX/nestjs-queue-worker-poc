import { TaskType } from '../../../task/types/task-type.enum';

export interface IMessagingProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  emit(pattern: string, payload: any): Promise<void>;
  isConnected(): boolean;
}

export interface IMessagingService {
  publishTask(
    taskType: TaskType,
    taskId: string,
    options?: { delay?: number; metadata?: Record<string, any> },
  ): Promise<void>;
  emitEvent(
    pattern: string,
    payload: any,
    options?: { delay?: number; metadata?: Record<string, any> },
  ): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface IMessagingConfig {
  transport: 'rmq' | 'nats';
  options: {
    urls?: string[];
    servers?: string[];
    queue?: string;
    queueOptions?: {
      durable?: boolean;
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
    };
    [key: string]: any;
  };
}
