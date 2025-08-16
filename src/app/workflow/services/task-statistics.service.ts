import { Injectable } from '@nestjs/common';
import { TaskStatus } from '../../task/types/task-status.enum';

export interface ITaskStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  processingTasks: number;
  isComplete: boolean;
  hasFailures: boolean;
  isInProgress: boolean;
  progress: number;
}

@Injectable()
export class TaskStatisticsService {
  calculateTaskStats(tasks: any[]): ITaskStats {
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
