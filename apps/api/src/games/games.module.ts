import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { ReferenceController } from './reference.controller';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GamesController, ReferenceController],
  providers: [GamesService],
})
export class GamesModule {}
