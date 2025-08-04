import { registerAs } from '@nestjs/config';

export default registerAs('invoice', () => ({
  pdfProcessor: {
    url:
      process.env.PDF_PROCESSOR_URL ||
      'https://mock-pdf-processor.com/generate',
  },
  emailService: {
    url: process.env.EMAIL_SERVICE_URL || 'https://mock-email-service.com/send',
  },
}));
