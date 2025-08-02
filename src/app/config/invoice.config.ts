import { registerAs } from '@nestjs/config';

export default registerAs('invoice', () => ({
  pdfProcessor: {
    url:
      process.env.PDF_PROCESSOR_URL ||
      'https://mock-pdf-processor.com/generate',
    timeout: parseInt(process.env.PDF_PROCESSOR_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.PDF_PROCESSOR_RETRIES || '3', 10),
  },
  emailService: {
    url: process.env.EMAIL_SERVICE_URL || 'https://mock-email-service.com/send',
    timeout: parseInt(process.env.EMAIL_SERVICE_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.EMAIL_SERVICE_RETRIES || '3', 10),
  },
  workflow: {
    maxConcurrentTasks: parseInt(
      process.env.INVOICE_MAX_CONCURRENT_TASKS || '10',
      10,
    ),
    defaultRetryAttempts: parseInt(
      process.env.INVOICE_DEFAULT_RETRY_ATTEMPTS || '3',
      10,
    ),
    taskTimeout: parseInt(process.env.INVOICE_TASK_TIMEOUT || '300000', 10), // 5 minutes
  },
  scheduling: {
    defaultCronExpression: process.env.INVOICE_DEFAULT_CRON || '0 0 * * *', // Daily at midnight
    maxScheduledTasks: parseInt(
      process.env.INVOICE_MAX_SCHEDULED_TASKS || '100',
      10,
    ),
  },
}));
