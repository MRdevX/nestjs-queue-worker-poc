export const QUEUE_NAMES = {
  HTTP_REQUEST: 'http_request_queue',
  DATA_PROCESSING: 'data_processing_queue',
  COMPENSATION: 'compensation_queue',
  FETCH_ORDERS: 'fetch_orders_queue',
  CREATE_INVOICE: 'create_invoice_queue',
  GENERATE_PDF: 'generate_pdf_queue',
  SEND_EMAIL: 'send_email_queue',
  FAILED_TASKS: 'failed_tasks_queue',
} as const;

export const EXCHANGE_NAMES = {
  DEAD_LETTER: 'dlx',
} as const;

export const ROUTING_KEYS = {
  FAILED: 'failed',
} as const;
