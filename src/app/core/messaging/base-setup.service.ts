import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export abstract class BaseSetupService implements OnModuleInit {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.setup();
  }

  protected abstract setup(): Promise<void>;
  protected abstract getServiceName(): string;

  protected logSetupStart(): void {
    this.logger.log(`Setting up ${this.getServiceName()}...`);
  }

  protected logSetupSuccess(): void {
    this.logger.log(`${this.getServiceName()} setup completed successfully`);
  }

  protected logSetupError(error: Error): void {
    this.logger.error(`Failed to setup ${this.getServiceName()}:`, error.stack);
    this.logger.warn(
      `Continuing without ${this.getServiceName()} setup - may not be properly configured`,
    );
  }
}
