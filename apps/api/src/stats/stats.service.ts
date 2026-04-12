import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Leaderboard ────────────────────────────────────────────────────────────

  async leaderboard(groupId: string) {
    const players = await this.prisma.player.findMany({
      where: { groupId, deletedAt: null },
      include: {
        gamePlayers: {
          include: { game: { select: { deletedAt: true } } },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    const rows = players.map((player) => {
      const active = player.gamePlayers.filter((gp) => gp.game.deletedAt === null);
      const gamesPlayed = active.length;
      const wins = active.filter((gp) => gp.isWinner).length;
      const scores = active.map((gp) => gp.score).filter((s): s is number => s !== null);
      const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const trs = active.map((gp) => gp.terraformRating).filter((t): t is number => t !== null);
      const avgTr = trs.length ? trs.reduce((a, b) => a + b, 0) / trs.length : null;

      return {
        player: { id: player.id, displayName: player.displayName },
        gamesPlayed,
        wins,
        winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
        avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
        avgTr: avgTr !== null ? Math.round(avgTr * 10) / 10 : null,
      };
    });

    return rows.sort((a, b) => b.winRate - a.winRate || b.gamesPlayed - a.gamesPlayed);
  }

  // ── Player profile ─────────────────────────────────────────────────────────

  async playerStats(groupId: string, playerId: string) {
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, groupId, deletedAt: null },
    });
    if (!player) throw new NotFoundException('Player not found');

    const gamePlayers = await this.prisma.gamePlayer.findMany({
      where: {
        playerId,
        game: { groupId, deletedAt: null },
      },
      include: {
        game: { include: { board: true } },
        corporation: true,
      },
      orderBy: { game: { playedAt: 'desc' } },
    });

    const gamesPlayed = gamePlayers.length;
    const wins = gamePlayers.filter((gp) => gp.isWinner).length;
    const scores = gamePlayers.map((gp) => gp.score).filter((s): s is number => s !== null);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const bestScore = scores.length ? Math.max(...scores) : null;
    const trs = gamePlayers.map((gp) => gp.terraformRating).filter((t): t is number => t !== null);
    const avgTr = trs.length ? trs.reduce((a, b) => a + b, 0) / trs.length : null;

    // Favourite corporation (most played)
    const corpCounts: Record<string, { name: string; count: number; wins: number }> = {};
    for (const gp of gamePlayers) {
      if (!gp.corporation) continue;
      const key = gp.corporation.id;
      if (!corpCounts[key]) corpCounts[key] = { name: gp.corporation.name, count: 0, wins: 0 };
      corpCounts[key].count++;
      if (gp.isWinner) corpCounts[key].wins++;
    }
    const topCorp = Object.values(corpCounts).sort((a, b) => b.count - a.count)[0] ?? null;

    // Board breakdown
    const boardCounts: Record<string, { name: string; count: number; wins: number }> = {};
    for (const gp of gamePlayers) {
      const key = gp.game.boardId;
      if (!boardCounts[key]) boardCounts[key] = { name: gp.game.board.name, count: 0, wins: 0 };
      boardCounts[key].count++;
      if (gp.isWinner) boardCounts[key].wins++;
    }

    // Recent 5 games
    const recentGames = gamePlayers.slice(0, 5).map((gp) => ({
      gameId: gp.gameId,
      playedAt: gp.game.playedAt,
      board: gp.game.board.name,
      corporation: gp.corporation?.name ?? null,
      score: gp.score,
      placement: gp.placement,
      isWinner: gp.isWinner,
    }));

    return {
      player: { id: player.id, displayName: player.displayName },
      gamesPlayed,
      wins,
      winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
      avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
      bestScore,
      avgTr: avgTr !== null ? Math.round(avgTr * 10) / 10 : null,
      favouriteCorporation: topCorp,
      boardBreakdown: Object.values(boardCounts).sort((a, b) => b.count - a.count),
      recentGames,
    };
  }

  // ── Corporation stats ──────────────────────────────────────────────────────

  async corporationStats(groupId: string) {
    const gamePlayers = await this.prisma.gamePlayer.findMany({
      where: {
        corporation: { isNot: null },
        game: { groupId, deletedAt: null },
      },
      include: {
        corporation: true,
      },
    });

    const byCorpId: Record<string, {
      id: string; name: string; plays: number; wins: number; scores: number[];
    }> = {};

    for (const gp of gamePlayers) {
      if (!gp.corporation) continue;
      const key = gp.corporation.id;
      if (!byCorpId[key]) {
        byCorpId[key] = { id: key, name: gp.corporation.name, plays: 0, wins: 0, scores: [] };
      }
      byCorpId[key].plays++;
      if (gp.isWinner) byCorpId[key].wins++;
      if (gp.score !== null) byCorpId[key].scores.push(gp.score);
    }

    const totalGames = await this.prisma.game.count({
      where: { groupId, deletedAt: null },
    });

    return Object.values(byCorpId)
      .map(({ id, name, plays, wins, scores }) => ({
        corporation: { id, name },
        plays,
        wins,
        winRate: plays > 0 ? wins / plays : 0,
        avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
        pickRate: totalGames > 0 ? plays / totalGames : 0,
      }))
      .sort((a, b) => b.plays - a.plays);
  }

  // ── Head-to-head ───────────────────────────────────────────────────────────

  async headToHead(groupId: string, playerAId: string, playerBId: string) {
    // Find all games where both players participated
    const sharedGameIds = await this.prisma.$queryRaw<{ game_id: string }[]>`
      SELECT gp1."gameId" AS game_id
      FROM game_players gp1
      JOIN game_players gp2 ON gp1."gameId" = gp2."gameId"
      JOIN games g ON g.id = gp1."gameId"
      WHERE gp1."playerId" = ${playerAId}
        AND gp2."playerId" = ${playerBId}
        AND g."groupId" = ${groupId}
        AND g."deletedAt" IS NULL
    `;

    const gameIds = sharedGameIds.map((r) => r.game_id);

    if (gameIds.length === 0) {
      return {
        playerA: await this.prisma.player.findFirst({ where: { id: playerAId }, select: { id: true, displayName: true } }),
        playerB: await this.prisma.player.findFirst({ where: { id: playerBId }, select: { id: true, displayName: true } }),
        gamesPlayed: 0,
        playerAWins: 0,
        playerBWins: 0,
        ties: 0,
        games: [],
      };
    }

    const gamePlayers = await this.prisma.gamePlayer.findMany({
      where: {
        gameId: { in: gameIds },
        playerId: { in: [playerAId, playerBId] },
      },
      include: {
        game: { include: { board: true } },
        corporation: { select: { name: true } },
        player: { select: { id: true, displayName: true } },
      },
      orderBy: { game: { playedAt: 'desc' } },
    });

    // Group by game
    const gameMap: Record<string, typeof gamePlayers> = {};
    for (const gp of gamePlayers) {
      if (!gameMap[gp.gameId]) gameMap[gp.gameId] = [];
      gameMap[gp.gameId]!.push(gp);
    }

    let playerAWins = 0;
    let playerBWins = 0;
    let ties = 0;

    const games = Object.entries(gameMap).map(([gameId, gps]) => {
      const gpA = gps.find((gp) => gp.playerId === playerAId)!;
      const gpB = gps.find((gp) => gp.playerId === playerBId)!;

      if (gpA.isWinner) playerAWins++;
      else if (gpB.isWinner) playerBWins++;
      else ties++;

      return {
        gameId,
        playedAt: gpA.game.playedAt,
        board: gpA.game.board.name,
        playerA: { score: gpA.score, placement: gpA.placement, corporation: gpA.corporation?.name ?? null, isWinner: gpA.isWinner },
        playerB: { score: gpB.score, placement: gpB.placement, corporation: gpB.corporation?.name ?? null, isWinner: gpB.isWinner },
      };
    });

    const [playerA, playerB] = await Promise.all([
      this.prisma.player.findFirst({ where: { id: playerAId }, select: { id: true, displayName: true } }),
      this.prisma.player.findFirst({ where: { id: playerBId }, select: { id: true, displayName: true } }),
    ]);

    return { playerA, playerB, gamesPlayed: gameIds.length, playerAWins, playerBWins, ties, games };
  }

  // ── Group overview ─────────────────────────────────────────────────────────

  async groupOverview(groupId: string) {
    const [totalGames, totalPlayers, recentGames] = await Promise.all([
      this.prisma.game.count({ where: { groupId, deletedAt: null } }),
      this.prisma.player.count({ where: { groupId, deletedAt: null } }),
      this.prisma.game.findMany({
        where: { groupId, deletedAt: null },
        include: {
          board: true,
          winner: { select: { id: true, displayName: true } },
          gamePlayers: { orderBy: { placement: 'asc' }, take: 1 },
        },
        orderBy: { playedAt: 'desc' },
        take: 5,
      }),
    ]);

    return { totalGames, totalPlayers, recentGames };
  }
}
