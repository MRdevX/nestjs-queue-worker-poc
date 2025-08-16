import { Injectable, Logger, Inject } from '@nestjs/common';
import { TaskService } from '../../task/task.service';
import { TaskQueueService } from '../../queue/task-queue.service';
import { IWorkflowTransitionStrategy } from '../strategies/workflow-transition.strategy';
import { TaskStatus } from '../../task/types/task-status.enum';
import { WorkflowStatus } from '../workflow.entity';
import { WorkflowService } from './workflow.service';

@Injectable()
export class WorkflowCoordinationService {
  private readonly logger = new Logger(WorkflowCoordinationService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly taskQueueService: TaskQueueService,
    private readonly workflowService: WorkflowService,
    @Inject('IWorkflowTransitionStrategy')
    private readonly transitionStrategy: IWorkflowTransitionStrategy,
  ) {}

  async handleTaskCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskByIdWithWorkflow(taskId);
    if (!task?.workflow) {
      this.logger.debug(
        `Task ${taskId} has no workflow, skipping coordination`,
      );
      return;
    }

    if (task.status === TaskStatus.FAILED) {
      await this.handleTaskFailure(
        taskId,
        new Error(task.error || 'Task failed'),
      );
      return;
    }

    const nextTransition = this.transitionStrategy.getNextTransition(
      task.type,
      task.workflow.definition,
    );

    if (nextTransition) {
      await this.createAndQueueNextTask(nextTransition, task.workflow.id);
    } else {
      await this.completeWorkflow(task.workflow.id);
    }
  }

  async handleTaskFailure(taskId: string, error: Error): Promise<void> {
    const task = await this.taskService.getTaskByIdWithWorkflow(taskId);
    if (!task?.workflow) {
      this.logger.debug(
        `Task ${taskId} has no workflow, skipping failure handling`,
      );
      return;
    }

    this.logger.warn(
      `Task ${taskId} failed in workflow ${task.workflow.id}: ${error.message}`,
    );

    if (task.retries >= task.maxRetries) {
      await this.failWorkflow(task.workflow.id, error.message);
    }
  }

  private async createAndQueueNextTask(
    transition: any,
    workflowId: string,
  ): Promise<void> {
    const nextTask = await this.taskService.createTask(
      transition.type,
      transition.payload,
      workflowId,
    );

    await this.taskQueueService.enqueueTask(
      nextTask.type,
      nextTask.payload,
      workflowId,
    );

    this.logger.log(
      `Created next task ${nextTask.id} for workflow ${workflowId}`,
    );
  }

  private async completeWorkflow(workflowId: string): Promise<void> {
    await this.workflowService.updateWorkflowStatus(
      workflowId,
      WorkflowStatus.COMPLETED,
    );
    this.logger.log(`Workflow ${workflowId} completed successfully`);
  }

  private async failWorkflow(workflowId: string, error: string): Promise<void> {
    await this.workflowService.updateWorkflowStatus(
      workflowId,
      WorkflowStatus.FAILED,
      error,
    );
    this.logger.log(`Workflow ${workflowId} failed: ${error}`);
  }
}
