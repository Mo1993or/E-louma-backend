/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../../dto/login.dto';
import { RegisterDto } from '../../dto/register.dto';
import { UpdateProfileDto } from '../../dto/update-profile.dto';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  VerificationCode,
  VerificationCodeDocument,
} from '../../schemas/verification-code.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from '../../dto/reset-password.dto';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/modules/notification/dto/send-notification.dto';

type JwtPayload = {
  sub: UserDocument['_id'];
  email: string;
  role: string;
  fcmToken?: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(VerificationCode.name)
    private codeModel: Model<VerificationCodeDocument>,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private notificationService: NotificationService,
  ) {}

  async register(data: RegisterDto) {
    const existingEmail = await this.userModel.findOne({ email: data.email });
    if (existingEmail) throw new BadRequestException('Email already exists');

    const existingPhoneNumber = await this.userModel.findOne({
      phonenumber: data.phonenumber,
    });
    if (existingPhoneNumber)
      throw new BadRequestException('PhoneNumber already exists');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.userModel.create({
      ...data,
      password: hashedPassword,
    });
    const payload: JwtPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      fcmToken: user.fcmToken,
    };
    const accessToken = this.jwtService.sign(payload);
    const { password: _pw, ...userWithoutPassword } = user.toObject();
    return { message: 'User created', user: userWithoutPassword, accessToken };
  }

  async login(data: LoginDto) {
    const user = await this.userModel.findOne({ email: data.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(user._id) },
      { $set: { fcmToken: data.fcmToken } },
    );

    const payload: JwtPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    await this.notificationService.notifyUser(
      String(user._id),
      'Connexion reussie',
      `Bienvenue ${user.fullname} ! Vous etes connecte a E-Louma.`,
      NotificationType.SUCCESS,
    );

    const { password: _pw, ...userWithoutPassword } = user.toObject();
    return { accessToken, user: userWithoutPassword };
  }

  async generateAndSendCode(
    email: string,
    type: 'REGISTER' | 'PASSWORD_RESET',
  ): Promise<void> {
    const rawCode = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);

    await this.codeModel.deleteMany({ email, type });
    await this.codeModel.create({ email, code: hashedCode, type });

    const isRegister = type === 'REGISTER';
    const subject = isRegister
      ? 'Activez votre compte'
      : 'Reinitialisation de votre mot de passe';
    const templateName = isRegister ? 'register' : 'reset-password';

    await this.mailerService.sendMail({
      to: email,
      subject: subject,
      template: templateName,
      context: { code: rawCode },
    });
  }

  async sendVerificationCode(userId: string, email: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    if (!user) {
      throw new BadRequestException('Utilisateur introuvable');
    }
    if (user.isVerified) {
      throw new BadRequestException('Compte deja verifie.');
    }
    return await this.generateAndSendCode(email, 'REGISTER');
  }

  async verifyRegisterCode(email: string, code: string) {
    const record = await this.codeModel.findOne({
      email,
      type: 'REGISTER',
      isUsed: false,
    });
    if (!record) {
      throw new BadRequestException('Code introuvable ou expire.');
    }
    const isMatch = await bcrypt.compare(code, record.code);
    if (!isMatch) {
      throw new BadRequestException('Code incorrect.');
    }
    await this.userModel.updateOne({ email }, { isVerified: true });
    await this.codeModel.deleteOne({ _id: record._id });
    return { message: 'Compte active avec succes.' };
  }

  async verifyCode(email: string, code: string) {
    const record = await this.codeModel.findOne({
      email,
      type: 'PASSWORD_RESET',
      isUsed: false,
    });
    if (!record) {
      throw new BadRequestException('Code introuvable.');
    }
    const expirationTimeMs = 15 * 60 * 1000;
    const codeAgeMs = Date.now() - record.createdAt.getTime();
    if (codeAgeMs > expirationTimeMs) {
      throw new BadRequestException('Code expire.');
    }
    const isMatch = await bcrypt.compare(code, record.code);
    if (!isMatch) {
      throw new BadRequestException('Code invalide.');
    }
    return { message: 'Code verifie avec succes.', code: code };
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const { email, code, newPassword } = resetDto;
    const record = await this.codeModel.findOne({
      email,
      type: 'PASSWORD_RESET',
    });
    if (!record || !record.code) {
      throw new BadRequestException('Code introuvable ou expire.');
    }
    const isMatch = await bcrypt.compare(code!, record.code);
    if (!isMatch) {
      throw new BadRequestException('Code incorrect.');
    }
    const hashedPassword = await bcrypt.hash(newPassword!, 10);
    await this.userModel.updateOne({ email }, { password: hashedPassword });
    await this.codeModel.deleteOne({ _id: record._id });
    return { message: 'Mot de passe modifie avec succes.' };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('-password')
      .lean();
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.userModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { fcmToken },
    );
    return { message: 'Token FCM mis a jour' };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    avatarUrl?: string,
  ) {
    const user = await this.userModel.findById(new Types.ObjectId(userId));
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Le mot de passe actuel est requis pour en definir un nouveau.',
        );
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Mot de passe actuel incorrect.');
      }
      user.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (dto.fullname) user.fullname = dto.fullname;
    if (dto.phonenumber) user.phonenumber = dto.phonenumber;
    if (avatarUrl) user.avatar = avatarUrl;

    await user.save();

    const { password: _pw, ...profile } = user.toObject();
    return { message: 'Profil mis a jour avec succes', user: profile };
  }
}
