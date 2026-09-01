import { AuthGuard } from '@nestjs/passport';
import { UserDocument } from '../schemas/user.schema';

export class JwtAuthGuard extends AuthGuard('jwt') {}

export type JwtPayload = {
  sub: UserDocument['_id'];
  email: string;
  role: string;
  fcmToken?: string;
};
