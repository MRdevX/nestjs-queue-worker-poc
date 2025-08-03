import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
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

  @Get('workflows')
  async getInvoiceWorkflows(
    @Query('customerId') customerId?: string,
    @Query('active') active?: boolean,
  ) {
    return this.invoiceService.getInvoiceWorkflows(customerId, active);
  }

  @Get('workflows/:workflowId')
  async getInvoiceWorkflow(@Param('workflowId') workflowId: string) {
    return this.invoiceService.getInvoiceWorkflow(workflowId);
  }

  @Get('workflows/:workflowId/status')
  async getInvoiceWorkflowStatusById(@Param('workflowId') workflowId: string) {
    return this.invoiceService.getInvoiceWorkflowStatusById(workflowId);
  }

  @Delete('workflows/:workflowId')
  async cancelInvoiceWorkflow(@Param('workflowId') workflowId: string) {
    return this.invoiceService.cancelInvoiceWorkflow(workflowId);
  }

  @Get('stats')
  async getInvoiceStats() {
    return this.invoiceService.getInvoiceStats();
  }

  @Get('customers')
  async getCustomersWithInvoices() {
    return this.invoiceService.getCustomersWithInvoices();
  }
}
