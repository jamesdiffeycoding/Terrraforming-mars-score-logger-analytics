import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthService } from './auth.service';

@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy, 'cognito') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    const region = config.get<string>('cognito.region') ?? 'eu-west-2';
    const userPoolId = config.get<string>('cognito.userPoolId') ?? '';
    const clientId = config.get<string>('cognito.clientId') ?? '';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: clientId,
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      }),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.syncUser(
      payload.sub,
      payload.email ?? payload.username,
      payload.name,
    );
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
