import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMemberGuard } from './guards/group-member.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { User } from '@prisma/client';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: User) {
    return this.groupsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.groupsService.findAllForUser(user);
  }

  @Get(':id')
  @UseGuards(GroupMemberGuard)
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(GroupMemberGuard)
  @Roles('admin', 'owner')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @CurrentUser() user: User) {
    return this.groupsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(GroupMemberGuard)
  @Roles('owner')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.groupsService.remove(id, user.id);
  }

  // ── Members ──────────────────────────────────────────────────────────────

  @Get(':id/members')
  @UseGuards(GroupMemberGuard)
  getMembers(@Param('id') id: string) {
    return this.groupsService.getMembers(id);
  }

  @Post(':id/invite')
  @UseGuards(GroupMemberGuard)
  @Roles('admin', 'owner')
  invite(@Param('id') id: string, @Body() dto: InviteMemberDto, @CurrentUser() user: User) {
    return this.groupsService.invite(id, dto, user);
  }

  @Patch(':id/members/:userId/role')
  @UseGuards(GroupMemberGuard)
  @Roles('admin', 'owner')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.updateMemberRole(id, userId, dto, user);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(GroupMemberGuard)
  @Roles('admin', 'owner')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: User,
  ) {
    return this.groupsService.removeMember(id, userId, user);
  }
}
