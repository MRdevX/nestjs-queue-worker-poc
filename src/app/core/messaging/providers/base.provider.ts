import { Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  IMessagingProvider,
  IMessagingConfig,
} from '../types/messaging.interface';

export abstract class BaseProvider implements IMessagingProvider {
  protected readonly logger = new Logger(this.constructor.name);
  protected client: ClientProxy;
  protected connected = false;

  constructor(protected readonly config: IMessagingConfig) {
    this.client = this.createClient();
  }

  protected abstract createClient(): ClientProxy;
  protected abstract getTransportName(): string;

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
      this.logger.log(`Connected to ${this.getTransportName()}`);
    } catch (error) {
      this.logger.error(
        `Failed to connect to ${this.getTransportName()}:`,
        error.stack,
      );
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.connected = false;
      this.logger.log(`Disconnected from ${this.getTransportName()}`);
    } catch (error) {
      this.logger.error(
        `Failed to disconnect from ${this.getTransportName()}:`,
        error.stack,
      );
      throw error;
    }
  }

  async emit(pattern: string, payload: any): Promise<void> {
    if (!this.connected) {
      throw new Error(`${this.getTransportName()} client is not connected`);
    }

    try {
      this.client.emit(pattern, payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit event to ${this.getTransportName()}: ${pattern}`,
        error.stack,
      );
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
