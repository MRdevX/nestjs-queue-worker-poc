import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRepository } from '../workflow.repository';
import { TaskService } from '../../task/task.service';
import { TaskQueueService } from '../../queue/task-queue.service';
import {
  ICreateWorkflowDto,
  IUpdateWorkflowDto,
  IWorkflowStatusResponse,
} from '../types';
import { TaskStatus } from '../../task/types/task-status.enum';
import { WorkflowEntity, WorkflowStatus } from '../workflow.entity';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly taskService: TaskService,
    private readonly taskQueueService: TaskQueueService,
  ) {}

  async createWorkflow(
    createWorkflowDto: ICreateWorkflowDto,
  ): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.create(createWorkflowDto);
    this.logger.log(`Workflow created: ${workflow.id}`);
    return workflow;
  }

  async getAllWorkflows(active?: boolean): Promise<WorkflowEntity[]> {
    if (active !== undefined) {
      return active
        ? this.workflowRepository.findActiveWorkflows()
        : this.workflowRepository.findMany({ isActive: false });
    }
    return this.workflowRepository.findAll();
  }

  async getActiveWorkflows(): Promise<WorkflowEntity[]> {
    return this.workflowRepository.findActiveWorkflows();
  }

  async getWorkflowById(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findById(id);
  }

  async getWorkflowWithTasks(id: string): Promise<WorkflowEntity | null> {
    return this.workflowRepository.findWithTasks(id);
  }

  async updateWorkflow(
    id: string,
    updateWorkflowDto: IUpdateWorkflowDto,
  ): Promise<WorkflowEntity | null> {
    const workflow = await this.workflowRepository.update(
      id,
      updateWorkflowDto,
    );
    if (workflow) {
      this.logger.log(`Workflow updated: ${id}`);
    }
    return workflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const deleted = await this.workflowRepository.delete(id);
    if (deleted) {
      this.logger.log(`Workflow deleted: ${id}`);
    }
    return deleted;
  }

  async startWorkflow(workflow: WorkflowEntity): Promise<void> {
    try {
      await this.updateWorkflowStatus(workflow.id, WorkflowStatus.RUNNING);

      const initialTask = await this.taskService.createTask(
        workflow.definition.initialTask.type,
        workflow.definition.initialTask.payload,
        workflow.id,
      );

      await this.taskQueueService.enqueueTask(
        initialTask.type,
        initialTask.payload,
        workflow.id,
      );

      this.logger.log(
        `Workflow ${workflow.id} started with initial task ${initialTask.id}`,
      );
    } catch (error) {
      await this.updateWorkflowStatus(
        workflow.id,
        WorkflowStatus.FAILED,
        error.message,
      );
      this.logger.error(`Failed to start workflow ${workflow.id}`, error.stack);
      throw error;
    }
  }

  async handleTaskCompletion(taskId: string): Promise<void> {
    const task = await this.taskService.getTaskById(taskId, ['workflow']);
    if (!task || !task.workflow) {
      return;
    }

    const workflow = task.workflow;
    const transition = workflow.definition.transitions?.[task.type];

    if (transition) {
      const nextTask = await this.taskService.createTask(
        transition.type,
        transition.payload || {},
        workflow.id,
      );

      await this.taskQueueService.enqueueTask(
        nextTask.type,
        nextTask.payload,
        workflow.id,
      );

      this.logger.log(
        `Created next task ${nextTask.id} for workflow ${workflow.id}`,
      );
    } else {
      await this.updateWorkflowStatus(workflow.id, WorkflowStatus.COMPLETED);
      this.logger.log(`Workflow ${workflow.id} completed`);
    }
  }

  async handleTaskFailure(taskId: string, error: Error): Promise<void> {
    const task = await this.taskService.getTaskById(taskId, ['workflow']);
    if (!task || !task.workflow) {
      return;
    }

    await this.updateWorkflowStatus(
      task.workflow.id,
      WorkflowStatus.FAILED,
      error.message,
    );
    this.logger.error(
      `Workflow ${task.workflow.id} failed due to task ${taskId}: ${error.message}`,
    );
  }

  async getWorkflowStatus(id: string): Promise<IWorkflowStatusResponse | null> {
    const workflow = await this.getWorkflowWithTasks(id);
    if (!workflow) {
      return null;
    }

    const tasks = workflow.tasks || [];
    const taskStats = this.calculateTaskStats(tasks);

    return {
      workflowId: id,
      workflowName: workflow.name,
      isActive: workflow.isActive,
      ...taskStats,
      tasks: tasks.map((task) => ({
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt,
        completedAt:
          task.status === TaskStatus.COMPLETED ? task.updatedAt : null,
        error: task.error,
      })),
    };
  }

  async updateWorkflowStatus(
    id: string,
    status: WorkflowStatus,
    error?: string,
  ): Promise<WorkflowEntity | null> {
    const updateData: any = { status };
    if (error) {
      updateData.error = error;
    }
    return this.workflowRepository.update(id, updateData);
  }

  private calculateTaskStats(tasks: any[]) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.COMPLETED,
    ).length;
    const failedTasks = tasks.filter(
      (task) => task.status === TaskStatus.FAILED,
    ).length;
    const pendingTasks = tasks.filter(
      (task) => task.status === TaskStatus.PENDING,
    ).length;
    const processingTasks = tasks.filter(
      (task) => task.status === TaskStatus.PROCESSING,
    ).length;

    const isComplete = totalTasks > 0 && completedTasks === totalTasks;
    const hasFailures = failedTasks > 0;
    const isInProgress = processingTasks > 0 || pendingTasks > 0;
    const progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      failedTasks,
      pendingTasks,
      processingTasks,
      isComplete,
      hasFailures,
      isInProgress,
      progress,
    };
  }
}
