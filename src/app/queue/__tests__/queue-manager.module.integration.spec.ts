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
      const controllers = Reflect.getMetadata(
        'controllers',
        QueueManagerModule,
      );
      const exports = Reflect.getMetadata('exports', QueueManagerModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(controllers).toBeDefined();
      expect(exports).toBeDefined();
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
  });
});
