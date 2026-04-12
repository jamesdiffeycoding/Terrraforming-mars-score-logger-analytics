import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { ResolveClaimDto } from './dto/resolve-claim.dto';
import { User } from '@prisma/client';

const PLAYER_INCLUDE = {
  linkedUser: { select: { id: true, displayName: true, avatarUrl: true } },
  createdBy: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(groupId: string, dto: CreatePlayerDto, user: User) {
    return this.prisma.player.create({
      data: {
        groupId,
        displayName: dto.displayName,
        isGuest: dto.isGuest ?? false,
        createdByUserId: user.id,
        // If not a guest, link to the creating user
        linkedUserId: dto.isGuest ? null : user.id,
      },
      include: PLAYER_INCLUDE,
    });
  }

  async findAll(groupId: string) {
    return this.prisma.player.findMany({
      where: { groupId, deletedAt: null },
      include: PLAYER_INCLUDE,
      orderBy: { displayName: 'asc' },
    });
  }

  async findOne(groupId: string, id: string) {
    const player = await this.prisma.player.findFirst({
      where: { id, groupId, deletedAt: null },
      include: {
        ...PLAYER_INCLUDE,
        claimRequests: {
          include: { requestingUser: { select: { id: true, displayName: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  async update(groupId: string, id: string, dto: UpdatePlayerDto, user: User) {
    const player = await this.prisma.player.findFirst({
      where: { id, groupId, deletedAt: null },
    });
    if (!player) throw new NotFoundException('Player not found');

    // Only creator, admin, or owner can edit — role check happens in guard
    return this.prisma.player.update({
      where: { id },
      data: { displayName: dto.displayName },
      include: PLAYER_INCLUDE,
    });
  }

  async remove(groupId: string, id: string) {
    const player = await this.prisma.player.findFirst({
      where: { id, groupId, deletedAt: null },
    });
    if (!player) throw new NotFoundException('Player not found');
    return this.prisma.player.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Claim requests ────────────────────────────────────────────────────────

  async createClaim(groupId: string, playerId: string, user: User) {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, groupId, deletedAt: null },
    });
    if (!player) throw new NotFoundException('Player not found');
    if (!player.isGuest) throw new BadRequestException('Only guest players can be claimed');
    if (player.linkedUserId) throw new ConflictException('This player is already linked to a user');

    const existing = await this.prisma.playerClaimRequest.findFirst({
      where: { playerId, requestingUserId: user.id, status: 'pending' },
    });
    if (existing) throw new ConflictException('You already have a pending claim for this player');

    return this.prisma.playerClaimRequest.create({
      data: { playerId, requestingUserId: user.id },
      include: { requestingUser: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async getClaims(groupId: string, playerId: string) {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, groupId, deletedAt: null },
    });
    if (!player) throw new NotFoundException('Player not found');

    return this.prisma.playerClaimRequest.findMany({
      where: { playerId },
      include: {
        requestingUser: { select: { id: true, displayName: true, email: true } },
        approvedBy: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveClaim(groupId: string, playerId: string, claimId: string, dto: ResolveClaimDto, resolver: User) {
    const claim = await this.prisma.playerClaimRequest.findFirst({
      where: { id: claimId, playerId },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'pending') throw new BadRequestException('Claim has already been resolved');

    if (dto.status === 'rejected') {
      return this.prisma.playerClaimRequest.update({
        where: { id: claimId },
        data: { status: 'rejected', approvedByUserId: resolver.id },
      });
    }

    // Approve — link the player to the requesting user
    const [resolved] = await this.prisma.$transaction([
      this.prisma.playerClaimRequest.update({
        where: { id: claimId },
        data: { status: 'approved', approvedByUserId: resolver.id },
      }),
      this.prisma.player.update({
        where: { id: playerId },
        data: { linkedUserId: claim.requestingUserId, isGuest: false },
      }),
      // Reject all other pending claims for this player
      this.prisma.playerClaimRequest.updateMany({
        where: { playerId, id: { not: claimId }, status: 'pending' },
        data: { status: 'rejected', approvedByUserId: resolver.id },
      }),
    ]);
    return resolved;
  }
}
