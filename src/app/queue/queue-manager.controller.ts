import { Controller, Get } from '@nestjs/common';
import { QueueManagerService } from './queue-manager.service';

@Controller('queue-manager')
export class QueueManagerController {
  constructor(private readonly queueManagerService: QueueManagerService) {}

  @Get('status')
  async getQueueStatus() {
    return this.queueManagerService.getQueueStatus();
  }

  @Get('overloaded')
  async checkOverloaded() {
    const isOverloaded = await this.queueManagerService.isOverloaded();
    return {
      isOverloaded,
      message: isOverloaded
        ? 'Queue is overloaded'
        : 'Queue is operating normally',
    };
  }

  @Get('failed-count')
  async getFailedTasksCount() {
    const count = await this.queueManagerService.getFailedTasksCount();
    return { failedTasks: count };
  }

  @Get('pending-count')
  async getPendingTasksCount() {
    const count = await this.queueManagerService.getPendingTasksCount();
    return { pendingTasks: count };
  }
}
