import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { QueueManagerService } from './queue-manager.service';
import { IEnqueueTaskDto } from './types/queue.types';

@Controller('queue-manager')
export class QueueManagerController {
  constructor(private readonly queueManagerService: QueueManagerService) {}

  @Post('enqueue')
  async enqueueTask(@Body() dto: IEnqueueTaskDto) {
    if (!dto.type || !dto.payload) {
      throw new BadRequestException('Task type and payload are required');
    }

    const taskId = await this.queueManagerService.enqueueTask(
      dto.type,
      dto.payload,
      dto.workflowId,
    );
    return { taskId, message: 'Task enqueued successfully' };
  }

  @Post('retry/:taskId')
  async retryTask(@Param('taskId') taskId: string) {
    await this.queueManagerService.retryTask(taskId);
    return { message: 'Task retry initiated' };
  }

  @Get('status')
  async getQueueStatus() {
    return this.queueManagerService.getQueueStatus();
  }
}
