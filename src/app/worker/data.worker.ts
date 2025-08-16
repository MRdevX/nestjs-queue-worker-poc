import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BaseWorker } from './base.worker';
import { TaskService } from '../task/task.service';
import { CoordinatorFactoryService } from '../workflow/services/coordinator-factory.service';
import { UtilsService } from '../core/utils/utils.service';
import { TaskType } from '../task/types/task-type.enum';
import { ITaskMessage } from '../core/messaging/types/task-message.interface';

@Injectable()
export class DataWorker extends BaseWorker {
  constructor(
    taskService: TaskService,
    coordinatorFactory: CoordinatorFactoryService,
  ) {
    super(taskService, coordinatorFactory);
  }

  @EventPattern('data.processing')
  async handleTask(@Payload() data: ITaskMessage) {
    return super.handleTask(data);
  }

  protected async processTask(taskId: string) {
    const task = await this.taskService.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    await UtilsService.sleep(500);

    if (task.payload?.forceFailure === true) {
      throw new Error('Forced failure for testing purposes');
    }

    if (Math.random() > 0.8) {
      throw new Error('Random processing failure');
    }
  }

  protected shouldProcessTaskType(taskType: TaskType): boolean {
    return taskType === TaskType.DATA_PROCESSING;
  }
}
