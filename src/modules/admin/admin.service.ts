/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Model } from 'mongoose';
import { UserProfile } from 'src/shared/enums/user-profile.enum';
import { LoginDto } from '../auth/dto/login.dto';
import { UserStatus } from 'src/shared/enums/user-status.enum';
import { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const user = await this.userModel.findOne({
      email: data.email,
      role: UserProfile.ADMIN,
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user && user.status === UserStatus.DISABLED) {
      throw new ConflictException(
        "Votre compte à été supprimé merci de contacter l'administrateur",
      );
    }

    const payload: JwtPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const { password: _pw, ...userWithoutPassword } = user.toObject();
    return { accessToken, user: userWithoutPassword };
  }
}
