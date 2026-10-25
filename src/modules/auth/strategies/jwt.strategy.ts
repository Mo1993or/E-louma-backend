import { Injectable } from ‘@nestjs/common’;
import { PassportStrategy } from ‘@nestjs/passport’;
import { ExtractJwt, Strategy } from ‘passport-jwt’;
import { ConfigService } from ‘@nestjs/config’;

type JwtPayload = {
sub: string;
email: string;
role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
constructor(configService: ConfigService) {
const jwtSecret = configService.get(‘JWT_SECRET’);

if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET est absent ou vide dans la configuration du serveur.',
  );
}
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: jwtSecret,
});

}

validate(payload: JwtPayload) {
return payload;
}
}
