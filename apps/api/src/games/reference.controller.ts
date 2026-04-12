import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('boards')
  getBoards() {
    return this.prisma.board.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('expansion-sets')
  getExpansionSets() {
    return this.prisma.expansionSet.findMany({ orderBy: { name: 'asc' } });
  }

  @Get('corporations')
  getCorporations() {
    return this.prisma.corporation.findMany({
      include: { expansionSet: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
