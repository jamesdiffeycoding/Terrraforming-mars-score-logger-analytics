import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CognitoStrategy } from './cognito.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'cognito' })],
  controllers: [AuthController],
  providers: [AuthService, CognitoStrategy],
  exports: [AuthService],
})
export class AuthModule {}
