import { INestApplication } from '@nestjs/common';
import { createTestApp, cleanDb } from './helpers/app';
import { createTestUser, authedRequest } from './helpers/auth';
import { PrismaService } from '../src/database/prisma.service';

describe('Groups (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: string;
  let groupId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await cleanDb(prisma);
    const { user, token: t } = await createTestUser(prisma, { email: 'owner@test.com', displayName: 'Owner' });
    token = t;
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDb(prisma);
    await app.close();
  });

  it('POST /groups creates a group and adds owner as active member', async () => {
    const req = authedRequest(app, token);
    const res = await req.post('/groups').send({ name: 'Test Group', description: 'A test group' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Group');
    expect(res.body.ownerUserId).toBe(userId);
    groupId = res.body.id;
  });

  it('GET /groups returns the created group', async () => {
    const req = authedRequest(app, token);
    const res = await req.get('/groups');
    expect(res.status).toBe(200);
    expect(res.body.some((g: { id: string }) => g.id === groupId)).toBe(true);
  });

  it('GET /groups/:id returns group details', async () => {
    const req = authedRequest(app, token);
    const res = await req.get(`/groups/${groupId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(groupId);
  });

  it('GET /groups/:id/members returns owner as active member', async () => {
    const req = authedRequest(app, token);
    const res = await req.get(`/groups/${groupId}/members`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].userId).toBe(userId);
    expect(res.body[0].role.name).toBe('owner');
    expect(res.body[0].status).toBe('active');
  });

  it('PATCH /groups/:id updates group name', async () => {
    const req = authedRequest(app, token);
    const res = await req.patch(`/groups/${groupId}`).send({ name: 'Renamed Group' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed Group');
  });

  it('POST /groups/:id/invite creates invitation for unknown email', async () => {
    const req = authedRequest(app, token);
    const res = await req.post(`/groups/${groupId}/invite`).send({
      email: 'unknown@test.com',
      role: 'member',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('unknown@test.com');
    expect(res.body.token).toBeDefined();
  });

  it('POST /groups/:id/invite adds existing user directly as active member', async () => {
    const { token: t2 } = await createTestUser(prisma, { email: 'member@test.com', displayName: 'Member' });
    void t2;

    const req = authedRequest(app, token);
    const res = await req.post(`/groups/${groupId}/invite`).send({
      email: 'member@test.com',
      role: 'member',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
  });

  it('DELETE /groups/:id/members/:userId removes the member', async () => {
    const req = authedRequest(app, token);
    const membersRes = await req.get(`/groups/${groupId}/members`);
    const member = membersRes.body.find((m: { role: { name: string } }) => m.role.name !== 'owner');
    expect(member).toBeDefined();

    const delRes = await req.delete(`/groups/${groupId}/members/${member.userId}`);
    expect(delRes.status).toBe(204);
  });
});
