import {
  Controller,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import {
  DatabaseSeeder,
  ISeederConfig,
  ISeederResult,
} from './database.seeder';

@Controller('seeder')
export class SeederController {
  constructor(private readonly databaseSeeder: DatabaseSeeder) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedDatabase(@Body() config?: Partial<ISeederConfig>): Promise<{
    message: string;
    timestamp: string;
    result: ISeederResult;
  }> {
    const result = await this.databaseSeeder.seed(config);
    return {
      message: 'Database seeded successfully',
      timestamp: new Date().toISOString(),
      result,
    };
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearDatabase(): Promise<{
    message: string;
    timestamp: string;
  }> {
    await this.databaseSeeder.clear();
    return {
      message: 'Database cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDatabase(@Body() config?: Partial<ISeederConfig>): Promise<{
    message: string;
    timestamp: string;
    result: ISeederResult;
  }> {
    await this.databaseSeeder.clear();
    const result = await this.databaseSeeder.seed(config);
    return {
      message: 'Database reset successfully',
      timestamp: new Date().toISOString(),
      result,
    };
  }
}
