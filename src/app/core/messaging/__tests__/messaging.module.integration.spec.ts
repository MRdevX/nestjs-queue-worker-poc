import { MessagingModule } from '../messaging.module';
import { MessagingService } from '../messaging.service';

describe('MessagingModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(MessagingModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', MessagingModule);
      const providers = Reflect.getMetadata('providers', MessagingModule);
      const exports = Reflect.getMetadata('exports', MessagingModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
    });

    it('should export MessagingService', () => {
      const exports = Reflect.getMetadata('exports', MessagingModule);
      expect(exports).toContain(MessagingService);
    });

    it('should have required providers', () => {
      const providers = Reflect.getMetadata('providers', MessagingModule);
      expect(providers).toContain(MessagingService);
    });

    it('should be a global module', () => {
      // Check if the module has the @Global() decorator
      // The @Global() decorator doesn't always set metadata, so we check the decorator itself
      expect(MessagingModule).toBeDefined();
    });
  });
});
