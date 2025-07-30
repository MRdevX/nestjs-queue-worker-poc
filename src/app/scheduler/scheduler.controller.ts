import { Controller, Post, Body, Get } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ICreateRecurringTask } from './types/create-recurring-task.interface';
import { ICreateScheduledTask } from './types/create-scheduled-task.interface';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('tasks/scheduled')
  async createScheduledTask(@Body() dto: ICreateScheduledTask) {
    const scheduledAt = new Date(dto.scheduledAt);

    if (isNaN(scheduledAt.getTime())) {
      throw new Error('Invalid scheduledAt date');
    }

    return this.schedulerService.createScheduledTask(
      dto.type,
      dto.payload,
      scheduledAt,
      dto.workflowId,
    );
  }

  @Post('tasks/recurring')
  async createRecurringTask(@Body() dto: ICreateRecurringTask) {
    return this.schedulerService.createRecurringTask(
      dto.type,
      dto.payload,
      dto.cronExpression,
      dto.workflowId,
    );
  }

  @Get('tasks/scheduled')
  async getScheduledTasks() {
    return this.schedulerService.getScheduledTasks();
  }
}
