import { WorkflowModule } from '../workflow.module';
import { CoordinatorService } from '../coordinator.service';
import { WorkflowRepository } from '../workflow.repository';

describe('WorkflowModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(WorkflowModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', WorkflowModule);
      const providers = Reflect.getMetadata('providers', WorkflowModule);
      const exports = Reflect.getMetadata('exports', WorkflowModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
    });

    it('should export CoordinatorService', () => {
      const exports = Reflect.getMetadata('exports', WorkflowModule);
      expect(exports).toContain(CoordinatorService);
    });

    it('should have required providers', () => {
      const providers = Reflect.getMetadata('providers', WorkflowModule);
      expect(providers).toContain(CoordinatorService);
      expect(providers).toContain(WorkflowRepository);
    });
  });
});
