import { TaskModule } from '../task.module';
import { TaskService } from '../task.service';
import { TaskRepository } from '../task.repository';
import { TaskLogRepository } from '../task-log.repository';
import { TaskController } from '../task.controller';
import { QueueController } from '../queue.controller';

describe('TaskModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(TaskModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', TaskModule);
      const providers = Reflect.getMetadata('providers', TaskModule);
      const exports = Reflect.getMetadata('exports', TaskModule);
      const controllers = Reflect.getMetadata('controllers', TaskModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
      expect(controllers).toBeDefined();
    });

    it('should export TaskService and TaskRepository', () => {
      const exports = Reflect.getMetadata('exports', TaskModule);
      expect(exports).toContain(TaskService);
      expect(exports).toContain(TaskRepository);
    });

    it('should have TaskController and QueueController', () => {
      const controllers = Reflect.getMetadata('controllers', TaskModule);
      expect(controllers).toContain(TaskController);
      expect(controllers).toContain(QueueController);
    });

    it('should have required providers', () => {
      const providers = Reflect.getMetadata('providers', TaskModule);
      expect(providers).toContain(TaskService);
      expect(providers).toContain(TaskRepository);
      expect(providers).toContain(TaskLogRepository);
    });
  });
});
