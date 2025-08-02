import { SchedulerModule } from '../scheduler.module';
import { SchedulerService } from '../scheduler.service';
import { SchedulerController } from '../scheduler.controller';

describe('SchedulerModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(SchedulerModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', SchedulerModule);
      const providers = Reflect.getMetadata('providers', SchedulerModule);
      const controllers = Reflect.getMetadata('controllers', SchedulerModule);
      const exports = Reflect.getMetadata('exports', SchedulerModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(controllers).toBeDefined();
      expect(exports).toBeDefined();
    });

    it('should import TaskModule', () => {
      const imports = Reflect.getMetadata('imports', SchedulerModule);
      expect(imports).toContain(
        jest.requireActual('../../task/task.module').TaskModule,
      );
    });

    it('should provide SchedulerService', () => {
      const providers = Reflect.getMetadata('providers', SchedulerModule);
      expect(providers).toContain(SchedulerService);
    });

    it('should have SchedulerController', () => {
      const controllers = Reflect.getMetadata('controllers', SchedulerModule);
      expect(controllers).toContain(SchedulerController);
    });

    it('should export SchedulerService', () => {
      const exports = Reflect.getMetadata('exports', SchedulerModule);
      expect(exports).toContain(SchedulerService);
    });
  });
});
