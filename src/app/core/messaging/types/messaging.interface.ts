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
    options?: MessagingOptions,
  ): Promise<void>;
  emitEvent(
    pattern: string,
    payload: any,
    options?: MessagingOptions,
  ): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface MessagingOptions {
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

export interface IMessagingSetupService {
  setup(): Promise<void>;
  getServiceName(): string;
}
