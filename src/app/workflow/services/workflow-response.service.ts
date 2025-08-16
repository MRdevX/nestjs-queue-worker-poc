import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowResponseService {
  createSuccessResponse(message: string, data?: Record<string, any>) {
    return {
      message,
      ...data,
    };
  }

  createWorkflowResponse(workflow: any) {
    return this.createSuccessResponse('Workflow operation successful', {
      workflow,
    });
  }

  createWorkflowListResponse(workflows: any[], message?: string) {
    return this.createSuccessResponse(
      message || 'Workflows retrieved successfully',
      {
        workflows,
        total: workflows.length,
      },
    );
  }

  createWorkflowStatusResponse(status: any) {
    return status;
  }
}
