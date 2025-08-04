import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CoordinatorService } from './coordinator.service';
import { ICreateWorkflowDto, IUpdateWorkflowDto } from './types';

@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly coordinatorService: CoordinatorService,
  ) {}

  @Post()
  async createWorkflow(@Body() createWorkflowDto: ICreateWorkflowDto) {
    const workflow =
      await this.workflowService.createWorkflow(createWorkflowDto);
    return this.createSuccessResponse('Workflow created successfully', {
      workflow,
    });
  }

  @Get()
  async getAllWorkflows(@Query('active') active?: boolean) {
    const workflows = await this.workflowService.getAllWorkflows(active);
    return this.createSuccessResponse('Workflows retrieved successfully', {
      workflows,
      total: workflows.length,
    });
  }

  @Get('active')
  async getActiveWorkflows() {
    const workflows = await this.workflowService.getActiveWorkflows();
    return this.createSuccessResponse(
      'Active workflows retrieved successfully',
      {
        workflows,
        total: workflows.length,
      },
    );
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowById(id);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  @Get(':id/with-tasks')
  async getWorkflowWithTasks(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowWithTasks(id);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  @Put(':id')
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updateWorkflowDto: IUpdateWorkflowDto,
  ) {
    const workflow = await this.workflowService.updateWorkflow(
      id,
      updateWorkflowDto,
    );
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return this.createSuccessResponse('Workflow updated successfully', {
      workflow,
    });
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    const deleted = await this.workflowService.deleteWorkflow(id);
    if (!deleted) {
      throw new NotFoundException('Workflow not found');
    }
    return this.createSuccessResponse('Workflow deleted successfully');
  }

  @Post(':id/start')
  async startWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowById(id);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Cannot start inactive workflow');
    }

    await this.coordinatorService.startWorkflow(workflow);
    return this.createSuccessResponse('Workflow started successfully', {
      workflowId: id,
    });
  }

  @Post(':id/activate')
  async activateWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.updateWorkflow(id, {
      isActive: true,
    });
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return this.createSuccessResponse('Workflow activated successfully', {
      workflow,
    });
  }

  @Post(':id/deactivate')
  async deactivateWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.updateWorkflow(id, {
      isActive: false,
    });
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return this.createSuccessResponse('Workflow deactivated successfully', {
      workflow,
    });
  }

  @Get(':id/status')
  async getWorkflowStatus(@Param('id') id: string) {
    const status = await this.workflowService.getWorkflowStatus(id);
    if (!status) {
      throw new NotFoundException('Workflow not found');
    }
    return status;
  }

  private createSuccessResponse(message: string, data?: any) {
    return {
      message,
      ...data,
    };
  }
}
