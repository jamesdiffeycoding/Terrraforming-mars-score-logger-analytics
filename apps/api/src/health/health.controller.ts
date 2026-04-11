import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('db')
  async checkDb() {
    const count = await this.prisma.role.count();
    return { status: 'ok', roles: count };
  }
}
