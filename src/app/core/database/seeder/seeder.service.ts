import { Injectable, Logger } from '@nestjs/common';
import {
  DatabaseSeeder,
  ISeederConfig,
  ISeederResult,
} from './database.seeder';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly databaseSeeder: DatabaseSeeder) {}

  async seedDatabase(config?: Partial<ISeederConfig>): Promise<ISeederResult> {
    return this.databaseSeeder.seed(config);
  }

  async clearDatabase(): Promise<void> {
    return this.databaseSeeder.clear();
  }

  async resetDatabase(config?: Partial<ISeederConfig>): Promise<ISeederResult> {
    await this.databaseSeeder.clear();
    return this.databaseSeeder.seed(config);
  }
}
