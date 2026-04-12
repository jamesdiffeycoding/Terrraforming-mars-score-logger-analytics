import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../groups/guards/group-member.guard';
import { Roles } from '../groups/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { ResolveClaimDto } from './dto/resolve-claim.dto';
import { User } from '@prisma/client';

@Controller('groups/:groupId/players')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  create(
    @Param('groupId') groupId: string,
    @Body() dto: CreatePlayerDto,
    @CurrentUser() user: User,
  ) {
    return this.playersService.create(groupId, dto, user);
  }

  @Get()
  findAll(@Param('groupId') groupId: string) {
    return this.playersService.findAll(groupId);
  }

  @Get(':id')
  findOne(@Param('groupId') groupId: string, @Param('id') id: string) {
    return this.playersService.findOne(groupId, id);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  update(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlayerDto,
    @CurrentUser() user: User,
  ) {
    return this.playersService.update(groupId, id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'owner')
  remove(@Param('groupId') groupId: string, @Param('id') id: string) {
    return this.playersService.remove(groupId, id);
  }

  // ── Claims ────────────────────────────────────────────────────────────────

  @Post(':id/claim')
  createClaim(
    @Param('groupId') groupId: string,
    @Param('id') playerId: string,
    @CurrentUser() user: User,
  ) {
    return this.playersService.createClaim(groupId, playerId, user);
  }

  @Get(':id/claims')
  @Roles('admin', 'owner')
  getClaims(@Param('groupId') groupId: string, @Param('id') playerId: string) {
    return this.playersService.getClaims(groupId, playerId);
  }

  @Patch(':id/claims/:claimId')
  @Roles('admin', 'owner')
  resolveClaim(
    @Param('groupId') groupId: string,
    @Param('id') playerId: string,
    @Param('claimId') claimId: string,
    @Body() dto: ResolveClaimDto,
    @CurrentUser() user: User,
  ) {
    return this.playersService.resolveClaim(groupId, playerId, claimId, dto, user);
  }
}
