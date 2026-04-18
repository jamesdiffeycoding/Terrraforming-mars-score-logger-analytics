import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';
import * as request from 'supertest';

/**
 * Creates a test user directly in the DB (bypassing Cognito) and returns a
 * signed JWT-like token. In integration tests the CognitoStrategy is replaced
 * by a test guard that decodes the user ID from a plain Bearer header.
 */
export async function createTestUser(
  prisma: PrismaService,
  overrides: { email?: string; displayName?: string } = {},
) {
  const email = overrides.email ?? `test-${Date.now()}@example.com`;
  const displayName = overrides.displayName ?? 'Test User';
  const cognitoSub = `test-sub-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const user = await prisma.user.create({
    data: { cognitoSub, email, displayName },
  });

  // Bearer token is simply the user ID — the test JWT guard accepts this
  const token = `test:${user.id}`;
  return { user, token };
}

export function authedRequest(app: INestApplication, token: string) {
  return {
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('Authorization', `Bearer ${token}`),
  };
}
