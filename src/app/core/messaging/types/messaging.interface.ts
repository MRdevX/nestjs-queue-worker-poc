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
    options?: IMessagingOptions,
  ): Promise<void>;
  emitEvent(
    pattern: string,
    payload: any,
    options?: IMessagingOptions,
  ): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface IMessagingOptions {
  delay?: number;
  metadata?: Record<string, any>;
}

export type TransportType = 'rmq' | 'nats' | 'redis';

export interface IMessagingConfig {
  transport: TransportType;
  options: {
    urls?: string[];
    servers?: string[];
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    queue?: string;
    queueOptions?: {
      durable?: boolean;
      deadLetterExchange?: string;
      deadLetterRoutingKey?: string;
    };
    [key: string]: any;
  };
}
