import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../database/prisma.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ConfirmPasswordDto } from './dto/confirm-password.dto';

@Injectable()
export class AuthService {
  private readonly cognito: CognitoIdentityProviderClient;
  private readonly clientId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.cognito = new CognitoIdentityProviderClient({
      region: this.config.get<string>('cognito.region'),
    });
    this.clientId = this.config.get<string>('cognito.clientId') ?? '';
  }

  async signUp(dto: SignUpDto) {
    try {
      await this.cognito.send(
        new SignUpCommand({
          ClientId: this.clientId,
          Username: dto.email,
          Password: dto.password,
          UserAttributes: [
            { Name: 'email', Value: dto.email },
            { Name: 'name', Value: dto.displayName },
          ],
        }),
      );
      return { message: 'Verification email sent. Please check your inbox.' };
    } catch (err: any) {
      if (err.name === 'UsernameExistsException') {
        throw new ConflictException('An account with this email already exists.');
      }
      throw new BadRequestException(err.message);
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      await this.cognito.send(
        new ConfirmSignUpCommand({
          ClientId: this.clientId,
          Username: dto.email,
          ConfirmationCode: dto.code,
        }),
      );
      return { message: 'Email verified. You can now log in.' };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  async login(dto: LoginDto) {
    try {
      const result = await this.cognito.send(
        new InitiateAuthCommand({
          AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
          ClientId: this.clientId,
          AuthParameters: {
            USERNAME: dto.email,
            PASSWORD: dto.password,
          },
        }),
      );
      return {
        accessToken: result.AuthenticationResult?.AccessToken,
        idToken: result.AuthenticationResult?.IdToken,
        refreshToken: result.AuthenticationResult?.RefreshToken,
      };
    } catch (err: any) {
      if (err.name === 'NotAuthorizedException' || err.name === 'UserNotFoundException') {
        throw new UnauthorizedException('Invalid email or password.');
      }
      if (err.name === 'UserNotConfirmedException') {
        throw new UnauthorizedException('Please verify your email before logging in.');
      }
      throw new BadRequestException(err.message);
    }
  }

  async refresh(dto: RefreshDto) {
    try {
      const result = await this.cognito.send(
        new InitiateAuthCommand({
          AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
          ClientId: this.clientId,
          AuthParameters: { REFRESH_TOKEN: dto.refreshToken },
        }),
      );
      return {
        accessToken: result.AuthenticationResult?.AccessToken,
        idToken: result.AuthenticationResult?.IdToken,
      };
    } catch (err: any) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    try {
      await this.cognito.send(
        new ForgotPasswordCommand({ ClientId: this.clientId, Username: dto.email }),
      );
    } catch {
      // Silently succeed to prevent email enumeration
    }
    return { message: 'If an account exists, a reset code has been sent.' };
  }

  async confirmPassword(dto: ConfirmPasswordDto) {
    try {
      await this.cognito.send(
        new ConfirmForgotPasswordCommand({
          ClientId: this.clientId,
          Username: dto.email,
          ConfirmationCode: dto.code,
          Password: dto.newPassword,
        }),
      );
      return { message: 'Password reset successfully.' };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  // Called by CognitoStrategy on every authenticated request
  async syncUser(cognitoSub: string, email: string, displayName?: string) {
    return this.prisma.user.upsert({
      where: { cognitoSub },
      update: { email },
      create: {
        cognitoSub,
        email,
        displayName: displayName ?? (email.split('@')[0] as string),
      },
    });
  }
}
