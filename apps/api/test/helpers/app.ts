import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { JwtTestGuard } from './jwt-test.guard';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    // Swap the real Cognito JWT guard for the test guard that accepts "test:<userId>" tokens
    .overrideProvider(JwtAuthGuard)
    .useClass(JwtTestGuard)
    .overrideProvider(APP_GUARD)
    .useClass(JwtTestGuard)
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export async function cleanDb(prisma: PrismaService) {
  // Delete in dependency order
  await prisma.gameExpansionSet.deleteMany();
  await prisma.gamePlayer.deleteMany();
  await prisma.game.deleteMany();
  await prisma.playerClaimRequest.deleteMany();
  await prisma.player.deleteMany();
  await prisma.ownershipTransferRequest.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();
}
