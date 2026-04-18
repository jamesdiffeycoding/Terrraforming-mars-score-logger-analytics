import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/app';

describe('Health (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('GET /health/db returns role count', async () => {
    const res = await request(app.getHttpServer()).get('/health/db');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(4);
  });
});
