export enum TaskType {
  HTTP_REQUEST = 'http_request',
  DATA_PROCESSING = 'data_processing',
  COMPENSATION = 'compensation',
  // Invoice workflow specific task types
  FETCH_ORDERS = 'fetch_orders',
  CREATE_INVOICE = 'create_invoice',
  GENERATE_PDF = 'generate_pdf',
  SEND_EMAIL = 'send_email',
}
