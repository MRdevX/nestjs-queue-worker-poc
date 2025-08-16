import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  Matches,
} from 'class-validator';

export class StartInvoiceWorkflowDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
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
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
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
  @Matches(
    /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/,
    {
      message: 'Invalid cron expression format',
    },
  )
  cronExpression: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
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
  @IsDateString()
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
