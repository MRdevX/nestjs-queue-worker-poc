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
import { ICreateWorkflowDto, IUpdateWorkflowDto } from './types';
import { WorkflowService } from './services/workflow.service';

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  async createWorkflow(@Body() createWorkflowDto: ICreateWorkflowDto) {
    const workflow =
      await this.workflowService.createWorkflow(createWorkflowDto);
    return {
      message: 'Workflow created successfully',
      workflow,
    };
  }

  @Get()
  async getAllWorkflows(@Query('active') active?: boolean) {
    const workflows = await this.workflowService.getAllWorkflows(active);
    return {
      message: 'Workflows retrieved successfully',
      workflows,
      total: workflows.length,
    };
  }

  @Get('active')
  async getActiveWorkflows() {
    const workflows = await this.workflowService.getActiveWorkflows();
    return {
      message: 'Active workflows retrieved successfully',
      workflows,
      total: workflows.length,
    };
  }

  @Get(':id')
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowById(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return {
      message: 'Workflow retrieved successfully',
      workflow,
    };
  }

  @Get(':id/with-tasks')
  async getWorkflowWithTasks(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowWithTasks(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return {
      message: 'Workflow with tasks retrieved successfully',
      workflow,
    };
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
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return {
      message: 'Workflow updated successfully',
      workflow,
    };
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    const deleted = await this.workflowService.deleteWorkflow(id);
    if (!deleted) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return {
      message: 'Workflow deleted successfully',
    };
  }

  @Post(':id/start')
  async startWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflowById(id);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    if (!workflow.isActive) {
      throw new Error('Cannot start inactive workflow');
    }

    await this.workflowService.startWorkflow(workflow);
    return {
      message: 'Workflow started successfully',
      workflowId: id,
    };
  }

  @Put(':id/activate')
  async activateWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.updateWorkflow(id, {
      isActive: true,
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return {
      message: 'Workflow activated successfully',
      workflow,
    };
  }

  @Put(':id/deactivate')
  async deactivateWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.updateWorkflow(id, {
      isActive: false,
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return {
      message: 'Workflow deactivated successfully',
      workflow,
    };
  }

  @Get(':id/status')
  async getWorkflowStatus(@Param('id') id: string) {
    const status = await this.workflowService.getWorkflowStatus(id);
    if (!status) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return status;
  }
}
