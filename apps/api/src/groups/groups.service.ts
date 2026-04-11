import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { User } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupDto, user: User) {
    const ownerRole = await this.prisma.role.findFirstOrThrow({ where: { name: 'owner' } });

    return this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerUserId: user.id,
        groupMembers: {
          create: {
            userId: user.id,
            roleId: ownerRole.id,
            status: 'active',
          },
        },
      },
      include: { groupMembers: { include: { user: true, role: true } } },
    });
  }

  async findAllForUser(user: User) {
    return this.prisma.group.findMany({
      where: {
        deletedAt: null,
        groupMembers: { some: { userId: user.id, status: 'active' } },
      },
      include: {
        _count: { select: { groupMembers: true } },
        groupMembers: {
          where: { userId: user.id },
          include: { role: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        _count: { select: { groupMembers: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async update(id: string, dto: UpdateGroupDto, _userId: string) {
    await this.prisma.group.findFirstOrThrow({ where: { id, deletedAt: null } });
    return this.prisma.group.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
    });
  }

  async remove(id: string, userId: string) {
    const group = await this.prisma.group.findFirstOrThrow({
      where: { id, deletedAt: null },
    });
    if (group.ownerUserId !== userId) throw new ForbiddenException('Only the owner can delete a group');
    return this.prisma.group.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Members ──────────────────────────────────────────────────────────────

  async getMembers(groupId: string) {
    return this.prisma.groupMember.findMany({
      where: { groupId, status: 'active' },
      include: {
        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
        role: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async invite(groupId: string, dto: InviteMemberDto, invitedBy: User) {
    const role = await this.prisma.role.findFirstOrThrow({ where: { name: dto.role } });

    const targetUser = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (targetUser) {
      const existing = await this.prisma.groupMember.findFirst({
        where: { groupId, userId: targetUser.id },
      });
      if (existing?.status === 'active') {
        throw new ConflictException('User is already a member of this group');
      }
      if (existing) {
        return this.prisma.groupMember.update({
          where: { id: existing.id },
          data: { status: 'active', roleId: role.id, invitedByUserId: invitedBy.id },
          include: { user: true, role: true },
        });
      }
      return this.prisma.groupMember.create({
        data: {
          groupId,
          userId: targetUser.id,
          roleId: role.id,
          status: 'active',
          invitedByUserId: invitedBy.id,
        },
        include: { user: true, role: true },
      });
    }

    // User doesn't exist yet — create a pending invitation record
    const existingInvite = await this.prisma.invitation.findFirst({
      where: { groupId, email: dto.email },
    });
    if (existingInvite) throw new ConflictException('An invitation has already been sent to this email');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = crypto.randomUUID();

    return this.prisma.invitation.create({
      data: {
        groupId,
        email: dto.email,
        roleId: role.id,
        invitedByUserId: invitedBy.id,
        token,
        expiresAt,
      },
    });
  }

  async updateMemberRole(groupId: string, targetUserId: string, dto: UpdateMemberRoleDto, _actingUser: User) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, status: 'active' },
      include: { role: true },
    });
    if (!membership) throw new NotFoundException('Member not found');

    if (membership.role.name === 'owner') throw new ForbiddenException("Cannot change the owner's role");
    if (dto.role === 'owner') throw new BadRequestException('Use the ownership transfer flow to change owner');

    const newRole = await this.prisma.role.findFirstOrThrow({ where: { name: dto.role } });

    return this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { roleId: newRole.id },
      include: { user: { select: { id: true, displayName: true, email: true } }, role: true },
    });
  }

  async removeMember(groupId: string, targetUserId: string, _actingUser: User) {
    const group = await this.prisma.group.findFirstOrThrow({ where: { id: groupId, deletedAt: null } });

    if (targetUserId === group.ownerUserId) {
      throw new ForbiddenException('Cannot remove the group owner');
    }

    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: targetUserId, status: 'active' },
    });
    if (!membership) throw new NotFoundException('Member not found');

    return this.prisma.groupMember.update({
      where: { id: membership.id },
      data: { status: 'removed' },
    });
  }
}
