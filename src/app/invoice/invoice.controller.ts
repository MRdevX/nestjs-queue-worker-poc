import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import {
  StartInvoiceWorkflowDto,
  CreateScheduledInvoiceWorkflowDto,
  CreateRecurringInvoiceWorkflowDto,
  CreateScheduledEmailWorkflowDto,
} from './types/invoice.dto';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('workflow/start')
  async startInvoiceWorkflow(@Body() dto: StartInvoiceWorkflowDto) {
    return this.invoiceService.startInvoiceWorkflow(dto);
  }

  @Post('workflow/scheduled')
  async createScheduledInvoiceWorkflow(
    @Body() dto: CreateScheduledInvoiceWorkflowDto,
  ) {
    return this.invoiceService.createScheduledInvoiceWorkflow(dto);
  }

  @Post('workflow/recurring')
  async createRecurringInvoiceWorkflow(
    @Body() dto: CreateRecurringInvoiceWorkflowDto,
  ) {
    return this.invoiceService.createRecurringInvoiceWorkflow(dto);
  }

  @Post('email/scheduled')
  async createScheduledEmailWorkflow(
    @Body() dto: CreateScheduledEmailWorkflowDto,
  ) {
    return this.invoiceService.createScheduledEmailWorkflow(dto);
  }

  @Get('tasks/:customerId')
  async getCustomerInvoiceTasks(@Param('customerId') customerId: string) {
    return this.invoiceService.getCustomerInvoiceTasks(customerId);
  }

  @Get('status/:customerId')
  async getInvoiceWorkflowStatus(@Param('customerId') customerId: string) {
    return this.invoiceService.getInvoiceWorkflowStatus(customerId);
  }
}
