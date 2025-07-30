import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TaskService } from '../task/task.service';
import { MessagingService } from '../core/messaging/messaging.service';
import { WorkflowEntity } from './workflow.entity';
import { TaskStatus } from '../task/types/task-status.enum';

@Injectable()
export class CoordinatorService {
  private readonly logger = new Logger(CoordinatorService.name);

  constructor(
    private taskService: TaskService,
    private messagingService: MessagingService,
  ) {}

  async startWorkflow(workflow: WorkflowEntity) {
    try {
      const task = await this.taskService.createTask(
        workflow.definition.initialTask.type,
        workflow.definition.initialTask.payload,
        workflow.id,
      );
      await this.messagingService.publishTask(task.type, task.id);
      this.logger.log(
        `Workflow ${workflow.id} started with initial task ${task.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to start workflow ${workflow.id}`, error.stack);
      throw error;
    }
  }

  async handleTaskCompletion(taskId: string) {
    try {
      const task = await this.taskService.getTaskByIdWithWorkflow(taskId);
      if (!task) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }

      if (!task.workflow) {
        this.logger.debug(
          `Task ${taskId} has no workflow, skipping coordination`,
        );
        return;
      }

      if (task.status === TaskStatus.FAILED) {
        this.logger.warn(
          `Task ${taskId} failed, workflow ${task.workflow.id} may need compensation`,
        );
        // compensation logic
        return;
      }

      const transition = task.workflow.definition.transitions[task.type];

      if (transition) {
        const nextTask = await this.taskService.createTask(
          transition.type,
          transition.payload,
          task.workflow.id,
        );
        await this.messagingService.publishTask(nextTask.type, nextTask.id);
        this.logger.log(
          `Created next task ${nextTask.id} for workflow ${task.workflow.id}`,
        );
      } else {
        this.logger.log(
          `No transition found for task ${taskId}, workflow ${task.workflow.id} completed`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle task completion for ${taskId}`,
        error.stack,
      );
      throw error;
    }
  }

  async handleTaskFailure(taskId: string, error: Error) {
    try {
      const task = await this.taskService.getTaskByIdWithWorkflow(taskId);
      if (!task) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }

      if (!task.workflow) {
        this.logger.debug(
          `Task ${taskId} has no workflow, skipping failure handling`,
        );
        return;
      }

      this.logger.warn(
        `Task ${taskId} failed in workflow ${task.workflow.id}: ${error.message}`,
      );

      // retry logic or compensation
    } catch (coordinatorError) {
      this.logger.error(
        `Failed to handle task failure for ${taskId}`,
        coordinatorError.stack,
      );
      throw coordinatorError;
    }
  }
}
