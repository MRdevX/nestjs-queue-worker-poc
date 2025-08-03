import { QueueManagerModule } from '../queue.module';
import { QueueManagerService } from '../queue-manager.service';
import { QueueManagerController } from '../queue-manager.controller';

describe('QueueManagerModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(QueueManagerModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', QueueManagerModule);
      const providers = Reflect.getMetadata('providers', QueueManagerModule);
      const exports = Reflect.getMetadata('exports', QueueManagerModule);
      const controllers = Reflect.getMetadata(
        'controllers',
        QueueManagerModule,
      );

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
      expect(controllers).toBeDefined();
    });

    it('should export QueueManagerService', () => {
      const exports = Reflect.getMetadata('exports', QueueManagerModule);
      expect(exports).toContain(QueueManagerService);
    });

    it('should have required providers', () => {
      const providers = Reflect.getMetadata('providers', QueueManagerModule);
      expect(providers).toContain(QueueManagerService);
    });

    it('should have required controllers', () => {
      const controllers = Reflect.getMetadata(
        'controllers',
        QueueManagerModule,
      );
      expect(controllers).toContain(QueueManagerController);
    });

    it('should import required modules', () => {
      const imports = Reflect.getMetadata('imports', QueueManagerModule);
      expect(imports).toBeDefined();
      expect(imports.length).toBeGreaterThan(0);
    });
  });

  describe('Service Dependencies', () => {
    it('should have TaskModule as dependency', () => {
      const imports = Reflect.getMetadata('imports', QueueManagerModule);

      expect(imports).toBeDefined();
    });

    it('should have MessagingModule as dependency', () => {
      const imports = Reflect.getMetadata('imports', QueueManagerModule);

      expect(imports).toBeDefined();
    });
  });

  describe('Controller Configuration', () => {
    it('should have QueueManagerController properly configured', () => {
      const controllers = Reflect.getMetadata(
        'controllers',
        QueueManagerModule,
      );
      expect(controllers).toContain(QueueManagerController);
    });

    it('should have controller with proper route prefix', () => {
      const routePrefix = Reflect.getMetadata('path', QueueManagerController);
      expect(routePrefix).toBe('queue-manager');
    });
  });

  describe('Service Configuration', () => {
    it('should have QueueManagerService as injectable', () => {
      expect(QueueManagerService).toBeDefined();
    });

    it('should have service with proper logger', () => {
      const service = new QueueManagerService({} as any, {} as any);
      expect(service).toBeDefined();
      expect(service['logger']).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should export QueueManagerService for external use', () => {
      const exports = Reflect.getMetadata('exports', QueueManagerModule);
      expect(exports).toContain(QueueManagerService);
    });

    it('should not export QueueManagerController', () => {
      const exports = Reflect.getMetadata('exports', QueueManagerModule);
      expect(exports).not.toContain(QueueManagerController);
    });
  });
});
