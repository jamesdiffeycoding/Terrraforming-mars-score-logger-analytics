import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
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

  // ── Invitations ───────────────────────────────────────────────────────────

  async getPendingInvitations(user: User) {
    return this.prisma.invitation.findMany({
      where: { email: user.email, acceptedAt: null, expiresAt: { gt: new Date() } },
      include: {
        group: { select: { id: true, name: true } },
        role: { select: { name: true } },
        invitedBy: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvitation(dto: AcceptInviteDto, user: User) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token: dto.token } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.acceptedAt) throw new ConflictException('Invitation already accepted');
    if (invitation.expiresAt < new Date()) throw new GoneException('Invitation has expired');
    if (invitation.email !== user.email) throw new ForbiddenException('This invitation is for a different email address');

    const existing = await this.prisma.groupMember.findFirst({
      where: { groupId: invitation.groupId, userId: user.id },
    });
    if (existing?.status === 'active') throw new ConflictException('Already a member of this group');

    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { token: dto.token },
        data: { acceptedAt: new Date() },
      });

      if (existing) {
        return tx.groupMember.update({
          where: { id: existing.id },
          data: { status: 'active', roleId: invitation.roleId },
          include: { group: { select: { id: true, name: true } }, role: true },
        });
      }

      return tx.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId: user.id,
          roleId: invitation.roleId,
          status: 'active',
          invitedByUserId: invitation.invitedByUserId,
        },
        include: { group: { select: { id: true, name: true } }, role: true },
      });
    });
  }

  // ── Ownership transfer ────────────────────────────────────────────────────

  async initiateTransfer(groupId: string, dto: InitiateTransferDto, actingUser: User) {
    const group = await this.prisma.group.findFirstOrThrow({ where: { id: groupId, deletedAt: null } });
    if (group.ownerUserId !== actingUser.id) throw new ForbiddenException('Only the owner can initiate a transfer');

    const targetMembership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: dto.toUserId, status: 'active' },
    });
    if (!targetMembership) throw new NotFoundException('Target user is not an active member of this group');
    if (dto.toUserId === actingUser.id) throw new BadRequestException('Cannot transfer ownership to yourself');

    // Cancel any existing pending transfer
    await this.prisma.ownershipTransferRequest.updateMany({
      where: { groupId, status: 'pending' },
      data: { status: 'rejected' },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.prisma.ownershipTransferRequest.create({
      data: {
        groupId,
        fromUserId: actingUser.id,
        toUserId: dto.toUserId,
        status: 'pending',
        expiresAt,
      },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
    });
  }

  async getPendingTransfer(groupId: string) {
    return this.prisma.ownershipTransferRequest.findFirst({
      where: { groupId, status: 'pending', expiresAt: { gt: new Date() } },
      include: {
        fromUser: { select: { id: true, displayName: true } },
        toUser: { select: { id: true, displayName: true } },
      },
    });
  }

  async respondToTransfer(groupId: string, requestId: string, accept: boolean, actingUser: User) {
    const request = await this.prisma.ownershipTransferRequest.findFirst({
      where: { id: requestId, groupId, status: 'pending' },
    });
    if (!request) throw new NotFoundException('Transfer request not found or already resolved');
    if (request.expiresAt < new Date()) throw new GoneException('Transfer request has expired');
    if (request.toUserId !== actingUser.id) throw new ForbiddenException('This transfer is not addressed to you');

    if (!accept) {
      return this.prisma.ownershipTransferRequest.update({
        where: { id: requestId },
        data: { status: 'rejected' },
      });
    }

    const ownerRole = await this.prisma.role.findFirstOrThrow({ where: { name: 'owner' } });
    const adminRole = await this.prisma.role.findFirstOrThrow({ where: { name: 'admin' } });

    return this.prisma.$transaction(async (tx) => {
      // Update transfer record
      const resolved = await tx.ownershipTransferRequest.update({
        where: { id: requestId },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      // Update group owner
      await tx.group.update({
        where: { id: groupId },
        data: { ownerUserId: request.toUserId },
      });

      // Demote previous owner to admin
      await tx.groupMember.updateMany({
        where: { groupId, userId: request.fromUserId },
        data: { roleId: adminRole.id },
      });

      // Promote new owner
      await tx.groupMember.updateMany({
        where: { groupId, userId: request.toUserId },
        data: { roleId: ownerRole.id },
      });

      return resolved;
    });
  }

  async cancelTransfer(groupId: string, requestId: string, actingUser: User) {
    const request = await this.prisma.ownershipTransferRequest.findFirst({
      where: { id: requestId, groupId, status: 'pending' },
    });
    if (!request) throw new NotFoundException('Transfer request not found');
    if (request.fromUserId !== actingUser.id) throw new ForbiddenException('Only the initiator can cancel a transfer');

    return this.prisma.ownershipTransferRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });
  }
}
