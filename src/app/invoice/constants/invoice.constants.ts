/* eslint-disable @typescript-eslint/naming-convention */
export const INVOICE_MESSAGES = {
  WORKFLOW_STARTED: 'Invoice workflow started',
  SCHEDULED_WORKFLOW_CREATED: 'Scheduled invoice workflow created',
  RECURRING_WORKFLOW_CREATED: 'Recurring invoice workflow created',
  SCHEDULED_EMAIL_CREATED: 'Scheduled email workflow created',
} as const;

export const INVOICE_ERROR_MESSAGES = {
  INVALID_SCHEDULED_DATE: 'Invalid scheduledAt date',
  TASK_NOT_FOUND: (taskId: string) => `Task with id ${taskId} not found`,
  INVOICE_DATA_NOT_FOUND: 'Invoice data not found in task payload',
  PDF_URL_NOT_FOUND: 'PDF URL not found in task payload',
} as const;

export const INVOICE_LOG_MESSAGES = {
  STARTING_WORKFLOW: (customerId: string) =>
    `Starting invoice workflow for customer: ${customerId}`,
  WORKFLOW_STARTED: (taskId: string) =>
    `Invoice workflow started with task ID: ${taskId}`,
  CREATING_SCHEDULED_WORKFLOW: (customerId: string) =>
    `Creating scheduled invoice workflow for customer: ${customerId}`,
  SCHEDULED_WORKFLOW_CREATED: (taskId: string) =>
    `Scheduled invoice workflow created with task ID: ${taskId}`,
  CREATING_RECURRING_WORKFLOW: (customerId: string) =>
    `Creating recurring invoice workflow for customer: ${customerId}`,
  RECURRING_WORKFLOW_CREATED: (taskId: string) =>
    `Recurring invoice workflow created with task ID: ${taskId}`,
  CREATING_SCHEDULED_EMAIL: (customerId: string) =>
    `Creating scheduled email workflow for customer: ${customerId}`,
  SCHEDULED_EMAIL_CREATED: (taskId: string) =>
    `Scheduled email workflow created with task ID: ${taskId}`,
  FETCHING_TASKS: (customerId: string) =>
    `Fetching invoice tasks for customer: ${customerId}`,
  FETCHING_STATUS: (customerId: string) =>
    `Fetching workflow status for customer: ${customerId}`,
  STATUS_CALCULATED: (customerId: string, totalTasks: number) =>
    `Workflow status calculated for customer ${customerId}: ${totalTasks} total tasks`,
  NO_DELIVERABLE_ORDERS: (customerId: string) =>
    `No deliverable orders found for customer ${customerId}`,
  INVOICE_TASK_CREATED: (taskId: string, customerId: string) =>
    `Created invoice task ${taskId} for customer ${customerId}`,
  PDF_TASK_CREATED: (taskId: string, invoiceId: string) =>
    `Created PDF generation task ${taskId} for invoice ${invoiceId}`,
  EMAIL_TASK_CREATED: (taskId: string, customerId: string) =>
    `Created email sending task ${taskId} for customer ${customerId}`,
  WORKFLOW_COMPLETED: (customerId: string, invoiceId?: string) =>
    `Invoice workflow completed for customer ${customerId}${invoiceId ? `, invoice ${invoiceId}` : ''}`,
  TASK_FAILED: (taskId: string) => `Invoice workflow task failed: ${taskId}`,
  COMPENSATION_TASK_CREATED: (
    compensationTaskId: string,
    failedTaskId: string,
  ) =>
    `Created compensation task ${compensationTaskId} for failed task ${failedTaskId}`,
} as const;
