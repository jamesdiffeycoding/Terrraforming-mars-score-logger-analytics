import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { GroupMemberGuard } from '../groups/guards/group-member.guard';

@Module({
  controllers: [PlayersController],
  providers: [PlayersService, GroupMemberGuard],
  exports: [PlayersService],
})
export class PlayersModule {}
