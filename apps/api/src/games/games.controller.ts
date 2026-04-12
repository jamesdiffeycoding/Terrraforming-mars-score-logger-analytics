import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../groups/guards/group-member.guard';
import { Roles } from '../groups/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { User } from '@prisma/client';

@Controller('groups/:groupId/games')
@UseGuards(JwtAuthGuard, GroupMemberGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  create(
    @Param('groupId') groupId: string,
    @Body() dto: CreateGameDto,
    @CurrentUser() user: User,
  ) {
    return this.gamesService.create(groupId, dto, user);
  }

  @Get()
  findAll(@Param('groupId') groupId: string) {
    return this.gamesService.findAll(groupId);
  }

  @Get(':id')
  findOne(@Param('groupId') groupId: string, @Param('id') id: string) {
    return this.gamesService.findOne(groupId, id);
  }

  @Patch(':id')
  @Roles('admin', 'owner')
  update(
    @Param('groupId') groupId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGameDto,
  ) {
    return this.gamesService.update(groupId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'owner')
  remove(@Param('groupId') groupId: string, @Param('id') id: string) {
    return this.gamesService.remove(groupId, id);
  }
}
