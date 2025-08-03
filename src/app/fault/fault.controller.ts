import {
  Controller,
  Post,
  Param,
  Get,
  NotFoundException,
} from '@nestjs/common';
import { FaultService } from './fault.service';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/types/task-status.enum';

@Controller('faults')
export class FaultController {
  constructor(
    private readonly faultService: FaultService,
    private readonly taskService: TaskService,
  ) {}

  @Post('retry/:taskId')
  async retryTask(@Param('taskId') taskId: string) {
    try {
      await this.faultService.handleRetry(taskId);
      return {
        message: 'Task retry initiated successfully',
        taskId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retry task: ${error.message}`);
    }
  }

  @Post('compensate/:taskId')
  async compensateTask(@Param('taskId') taskId: string) {
    try {
      await this.faultService.handleCompensation(taskId);
      return {
        message: 'Compensation task created and queued successfully',
        taskId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to create compensation task: ${error.message}`);
    }
  }

  @Get('failed-tasks')
  async getFailedTasks() {
    const failedTasks = await this.taskService.findMany({
      status: TaskStatus.FAILED,
    });

    return {
      tasks: failedTasks,
      total: failedTasks.length,
    };
  }

  @Get('retryable-tasks')
  async getRetryableTasks() {
    const retryableTasks = await this.taskService.findMany({
      status: TaskStatus.FAILED,
    });

    const tasks = retryableTasks.filter(
      (task) => task.retries < task.maxRetries,
    );

    return {
      tasks,
      total: tasks.length,
    };
  }

  @Get('compensation-tasks')
  async getCompensationTasks() {
    const compensationTasks = await this.taskService.findMany({
      type: 'compensation',
    });

    return {
      tasks: compensationTasks,
      total: compensationTasks.length,
    };
  }

  @Get('stats')
  async getFaultStats() {
    const failedTasks = await this.taskService.findMany({
      status: TaskStatus.FAILED,
    });

    const retryableTasks = failedTasks.filter(
      (task) => task.retries < task.maxRetries,
    );
    const compensationTasks = await this.taskService.findMany({
      type: 'compensation',
    });

    const tasksByErrorType = {};
    failedTasks.forEach((task) => {
      const errorType = task.error ? task.error.split(':')[0] : 'Unknown';
      tasksByErrorType[errorType] = (tasksByErrorType[errorType] || 0) + 1;
    });

    return {
      totalFailedTasks: failedTasks.length,
      retryableTasks: retryableTasks.length,
      compensationTasks: compensationTasks.length,
      tasksByErrorType,
      averageRetries:
        failedTasks.length > 0
          ? failedTasks.reduce((sum, task) => sum + task.retries, 0) /
            failedTasks.length
          : 0,
    };
  }
}
