import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class StartInvoiceWorkflowDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;
}

export class CreateScheduledInvoiceWorkflowDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;
}

export class CreateRecurringInvoiceWorkflowDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  cronExpression: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;
}

export class CreateScheduledEmailWorkflowDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsOptional()
  @IsString()
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
