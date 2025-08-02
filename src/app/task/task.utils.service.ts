/**
 * Task-specific utility functions
 */
export class TaskUtilsService {
  /**
   * Count tasks by status
   */
  static countTasksByStatus(tasks: any[]) {
    const counts = {
      total: tasks.length,
      completed: 0,
      failed: 0,
      pending: 0,
      processing: 0,
    };

    for (const task of tasks) {
      switch (task.status) {
        case 'completed':
          counts.completed++;
          break;
        case 'failed':
          counts.failed++;
          break;
        case 'pending':
          counts.pending++;
          break;
        case 'processing':
          counts.processing++;
          break;
      }
    }

    return counts;
  }

  /**
   * Format a task for API response
   */
  static formatTask(task: any) {
    return {
      id: task.id,
      type: task.type,
      status: task.status,
      createdAt: task.createdAt,
      completedAt: task.status === 'completed' ? task.updatedAt : null,
    };
  }
}
