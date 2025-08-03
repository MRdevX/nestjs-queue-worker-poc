import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WorkflowRepository } from './workflow.repository';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/types/task-status.enum';
import { WorkflowEntity, WorkflowStatus } from './workflow.entity';
import {
  ICreateWorkflowDto,
  IUpdateWorkflowDto,
  IWorkflowStatusResponse,
} from './types';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly taskService: TaskService,
  ) {}

  async createWorkflow(
    createWorkflowDto: ICreateWorkflowDto,
  ): Promise<WorkflowEntity> {
    this.logger.log(`Creating workflow: ${createWorkflowDto.name}`);

    const workflow = await this.workflowRepository.create({
      name: createWorkflowDto.name,
      definition: createWorkflowDto.definition,
      isActive: createWorkflowDto.isActive ?? true,
    });

    this.logger.log(`Workflow created with ID: ${workflow.id}`);
    return workflow;
  }

  async getAllWorkflows(active?: boolean): Promise<WorkflowEntity[]> {
    if (active !== undefined) {
      return this.workflowRepository.findMany({ isActive: active });
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
    try {
      return await this.workflowRepository.findWithTasks(id);
    } catch (error) {
      return null;
    }
  }

  async updateWorkflow(
    id: string,
    updateWorkflowDto: IUpdateWorkflowDto,
  ): Promise<WorkflowEntity | null> {
    this.logger.log(`Updating workflow: ${id}`);

    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) {
      return null;
    }

    const updatedWorkflow = await this.workflowRepository.update(
      id,
      updateWorkflowDto,
    );
    this.logger.log(`Workflow updated: ${id}`);

    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    this.logger.log(`Deleting workflow: ${id}`);

    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) {
      return false;
    }

    const workflowWithTasks = await this.getWorkflowWithTasks(id);
    if (workflowWithTasks && workflowWithTasks.tasks.length > 0) {
      throw new Error('Cannot delete workflow with existing tasks');
    }

    const deleted = await this.workflowRepository.delete(id);
    this.logger.log(`Workflow deleted: ${id}`);

    return deleted;
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

  async getWorkflowsByCustomer(customerId: string): Promise<WorkflowEntity[]> {
    return this.workflowRepository.findWorkflowsByCustomer(customerId);
  }

  async updateWorkflowStatus(
    id: string,
    status: WorkflowStatus,
    error?: string,
  ): Promise<WorkflowEntity | null> {
    this.logger.log(`Updating workflow ${id} status to ${status}`);

    const updateData: any = { status };
    if (error) {
      updateData.error = error;
    }

    const updatedWorkflow = await this.workflowRepository.update(
      id,
      updateData,
    );
    this.logger.log(`Workflow ${id} status updated to ${status}`);

    return updatedWorkflow;
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
