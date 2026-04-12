import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../groups/guards/group-member.guard';
import { StatsService } from './stats.service';

@Controller('groups/:groupId/stats')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  overview(@Param('groupId') groupId: string) {
    return this.statsService.groupOverview(groupId);
  }

  @Get('leaderboard')
  leaderboard(@Param('groupId') groupId: string) {
    return this.statsService.leaderboard(groupId);
  }

  @Get('corporations')
  corporations(@Param('groupId') groupId: string) {
    return this.statsService.corporationStats(groupId);
  }

  @Get('players/:playerId')
  playerStats(
    @Param('groupId') groupId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.statsService.playerStats(groupId, playerId);
  }

  @Get('head-to-head')
  headToHead(
    @Param('groupId') groupId: string,
    @Query('playerA') playerA: string,
    @Query('playerB') playerB: string,
  ) {
    return this.statsService.headToHead(groupId, playerA, playerB);
  }
}
