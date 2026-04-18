import { INestApplication } from '@nestjs/common';
import { createTestApp, cleanDb } from './helpers/app';
import { createTestUser, authedRequest } from './helpers/auth';
import { PrismaService } from '../src/database/prisma.service';

describe('Games (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let groupId: string;
  let playerId: string;
  let boardId: string;
  let gameId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanDb(prisma);

    const { user, token: t } = await createTestUser(prisma, { email: 'gamer@test.com', displayName: 'Gamer' });
    token = t;

    // Create group
    const req = authedRequest(app, token);
    const groupRes = await req.post('/groups').send({ name: 'Game Group' });
    groupId = groupRes.body.id;

    // Create a player
    const playerRes = await req.post(`/groups/${groupId}/players`).send({
      displayName: 'Player One',
      isGuest: false,
    });
    playerId = playerRes.body.id;

    // Get a board from seed data
    const boardRes = await req.get('/boards');
    boardId = boardRes.body[0].id;

    void user;
  });

  afterAll(async () => {
    await cleanDb(prisma);
    await app.close();
  });

  it('POST /groups/:groupId/games records a game', async () => {
    const req = authedRequest(app, token);
    const res = await req.post(`/groups/${groupId}/games`).send({
      boardId,
      playedAt: new Date().toISOString(),
      expansionSetIds: [],
      players: [
        { playerId, score: 67, terraformRating: 25, placement: 1, isWinner: true },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.board).toBeDefined();
    expect(res.body.gamePlayers).toHaveLength(1);
    expect(res.body.gamePlayers[0].score).toBe(67);
    expect(res.body.gamePlayers[0].isWinner).toBe(true);
    gameId = res.body.id;
  });

  it('GET /groups/:groupId/games lists recorded games', async () => {
    const req = authedRequest(app, token);
    const res = await req.get(`/groups/${groupId}/games`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(gameId);
  });

  it('GET /groups/:groupId/games/:id returns game detail', async () => {
    const req = authedRequest(app, token);
    const res = await req.get(`/groups/${groupId}/games/${gameId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(gameId);
    expect(res.body.winner).toBeDefined();
  });

  it('GET /groups/:groupId/stats/leaderboard returns player entry', async () => {
    const req = authedRequest(app, token);
    const res = await req.get(`/groups/${groupId}/stats/leaderboard`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].wins).toBe(1);
    expect(res.body[0].winRate).toBe(1);
  });

  it('DELETE /groups/:groupId/games/:id soft-deletes the game', async () => {
    const req = authedRequest(app, token);
    const res = await req.delete(`/groups/${groupId}/games/${gameId}`);
    expect(res.status).toBe(204);

    const listRes = await req.get(`/groups/${groupId}/games`);
    expect(listRes.body.length).toBe(0);
  });
});
