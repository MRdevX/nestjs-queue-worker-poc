export class StartInvoiceWorkflowDto {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  workflowId?: string;
}

export class CreateScheduledInvoiceWorkflowDto {
  customerId: string;
  scheduledAt: string;
  dateFrom?: string;
  dateTo?: string;
  workflowId?: string;
}

export class CreateRecurringInvoiceWorkflowDto {
  customerId: string;
  cronExpression: string;
  dateFrom?: string;
  dateTo?: string;
  workflowId?: string;
}

export class CreateScheduledEmailWorkflowDto {
  customerId: string;
  invoiceId: string;
  scheduledAt: string;
  workflowId?: string;
}

export class InvoiceWorkflowResponseDto {
  message: string;
  taskId: string;
  workflowId?: string;
  scheduledAt?: string;
  cronExpression?: string;
}

export class CustomerInvoiceTasksResponseDto {
  customerId: string;
  tasks: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  }>;
}

export class InvoiceWorkflowStatusResponseDto {
  customerId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  processingTasks: number;
  workflows: Record<
    string,
    {
      totalTasks: number;
      completedTasks: number;
      failedTasks: number;
      isComplete: boolean;
    }
  >;
}
