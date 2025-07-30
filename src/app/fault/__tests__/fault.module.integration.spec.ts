import { FaultModule } from '../fault.module';
import { FaultService } from '../fault.service';

describe('FaultModule Integration', () => {
  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(FaultModule).toBeDefined();
    });

    it('should have proper module metadata', () => {
      const moduleMetadata = Reflect.getMetadata('imports', FaultModule);
      const providers = Reflect.getMetadata('providers', FaultModule);
      const exports = Reflect.getMetadata('exports', FaultModule);

      expect(moduleMetadata).toBeDefined();
      expect(providers).toBeDefined();
      expect(exports).toBeDefined();
    });

    it('should export FaultService', () => {
      const exports = Reflect.getMetadata('exports', FaultModule);
      expect(exports).toContain(FaultService);
    });

    it('should have required providers', () => {
      const providers = Reflect.getMetadata('providers', FaultModule);
      expect(providers).toContain(FaultService);
    });
  });
});
