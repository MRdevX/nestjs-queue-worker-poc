import {
  Controller,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { DatabaseSeeder } from './database.seeder';

interface ISeedConfig {
  workflows?: number;
  tasksPerType?: number;
  customers?: number;
}

@Controller('seeder')
export class SeederController {
  constructor(private readonly databaseSeeder: DatabaseSeeder) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedDatabase(@Body() config?: ISeedConfig) {
    await this.databaseSeeder.seed(config);
    return {
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearDatabase() {
    await this.databaseSeeder.clear();
    return {
      message: 'Database cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDatabase(@Body() config?: ISeedConfig) {
    await this.databaseSeeder.clear();
    await this.databaseSeeder.seed(config);
    return {
      message: 'Database reset successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
