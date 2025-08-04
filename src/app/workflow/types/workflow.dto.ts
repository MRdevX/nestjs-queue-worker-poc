import { TaskType } from '../../task/types/task-type.enum';

export interface IWorkflowDefinition {
  initialTask: {
    type: TaskType;
    payload: Record<string, any>;
  };
  transitions: Record<
    string,
    {
      type: TaskType;
      payload: Record<string, any>;
    }
  >;
}

export interface ICreateWorkflowDto {
  name: string;
  definition: IWorkflowDefinition;
  isActive?: boolean;
}

export interface IUpdateWorkflowDto {
  name?: string;
  definition?: IWorkflowDefinition;
  isActive?: boolean;
}

export interface IWorkflowStatusResponse {
  workflowId: string;
  workflowName: string;
  isActive: boolean;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  processingTasks: number;
  isComplete: boolean;
  hasFailures: boolean;
  isInProgress: boolean;
  progress: number;
  tasks: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    error: string | null;
  }>;
}
