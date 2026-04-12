import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { User } from '@prisma/client';

const GAME_INCLUDE = {
  board: true,
  winner: { select: { id: true, displayName: true } },
  createdBy: { select: { id: true, displayName: true } },
  gameExpansionSets: { include: { expansionSet: true } },
  gamePlayers: {
    include: {
      player: { select: { id: true, displayName: true } },
      corporation: { select: { id: true, name: true } },
    },
    orderBy: { placement: 'asc' as const },
  },
};

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(groupId: string, dto: CreateGameDto, user: User) {
    if (!dto.players || dto.players.length < 1) {
      throw new BadRequestException('At least one player is required');
    }

    const winners = dto.players.filter((p) => p.isWinner);
    if (winners.length > 1) {
      throw new BadRequestException('Only one player can be the winner');
    }

    const winnerPlayerId = winners[0]?.playerId ?? null;

    return this.prisma.$transaction(async (tx) => {
      const game = await tx.game.create({
        data: {
          groupId,
          boardId: dto.boardId,
          playedAt: new Date(dto.playedAt),
          notes: dto.notes,
          winnerPlayerId,
          createdByUserId: user.id,
          gameExpansionSets: dto.expansionSetIds?.length
            ? { create: dto.expansionSetIds.map((id) => ({ expansionSetId: id })) }
            : undefined,
          gamePlayers: {
            create: dto.players.map((p, i) => ({
              playerId: p.playerId,
              corporationId: p.corporationId ?? null,
              score: p.score ?? null,
              placement: p.placement ?? i + 1,
              terraformRating: p.terraformRating ?? null,
              isWinner: p.isWinner ?? false,
              notes: p.notes ?? null,
            })),
          },
        },
        include: GAME_INCLUDE,
      });
      return game;
    });
  }

  async findAll(groupId: string) {
    return this.prisma.game.findMany({
      where: { groupId, deletedAt: null },
      include: GAME_INCLUDE,
      orderBy: { playedAt: 'desc' },
    });
  }

  async findOne(groupId: string, id: string) {
    const game = await this.prisma.game.findFirst({
      where: { id, groupId, deletedAt: null },
      include: GAME_INCLUDE,
    });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async update(groupId: string, id: string, dto: UpdateGameDto) {
    const game = await this.prisma.game.findFirst({
      where: { id, groupId, deletedAt: null },
    });
    if (!game) throw new NotFoundException('Game not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.players !== undefined) {
        const winners = dto.players.filter((p) => p.isWinner);
        if (winners.length > 1) throw new BadRequestException('Only one player can be the winner');

        // Replace all game_players
        await tx.gamePlayer.deleteMany({ where: { gameId: id } });
        await tx.gameExpansionSet.deleteMany({ where: { gameId: id } });

        const winnerPlayerId = winners[0]?.playerId ?? null;

        return tx.game.update({
          where: { id },
          data: {
            boardId: dto.boardId ?? game.boardId,
            playedAt: dto.playedAt ? new Date(dto.playedAt) : game.playedAt,
            notes: dto.notes !== undefined ? dto.notes : game.notes,
            winnerPlayerId,
            gameExpansionSets: dto.expansionSetIds?.length
              ? { create: dto.expansionSetIds.map((eid) => ({ expansionSetId: eid })) }
              : undefined,
            gamePlayers: {
              create: dto.players.map((p, i) => ({
                playerId: p.playerId,
                corporationId: p.corporationId ?? null,
                score: p.score ?? null,
                placement: p.placement ?? i + 1,
                terraformRating: p.terraformRating ?? null,
                isWinner: p.isWinner ?? false,
                notes: p.notes ?? null,
              })),
            },
          },
          include: GAME_INCLUDE,
        });
      }

      return tx.game.update({
        where: { id },
        data: {
          boardId: dto.boardId ?? undefined,
          playedAt: dto.playedAt ? new Date(dto.playedAt) : undefined,
          notes: dto.notes !== undefined ? dto.notes : undefined,
        },
        include: GAME_INCLUDE,
      });
    });
  }

  async remove(groupId: string, id: string) {
    const game = await this.prisma.game.findFirst({
      where: { id, groupId, deletedAt: null },
    });
    if (!game) throw new NotFoundException('Game not found');
    return this.prisma.game.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
