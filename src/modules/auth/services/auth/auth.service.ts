import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../../dto/login.dto';
import { RegisterDto } from '../../dto/register.dto';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  VerificationCode,
  VerificationCodeDocument,
} from '../../schemas/verification-code.schema';
import { MailerService } from '@nestjs-modules/mailer';
import { ResetPasswordDto } from '../../dto/reset-password.dto';

type JwtPayload = {
  sub: UserDocument['_id'];
  email: string;
  role: string;
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
  ) {}

  async register(data: RegisterDto) {
    const existingUser = await this.userModel.findOne({ email: data.email });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userModel.create({
      ...data,
      password: hashedPassword,
    });

    const payload: JwtPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'User created',
      user,
      accessToken,
    };
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

    const payload: JwtPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user,
    };
  }

  // --- GÉNÉRATION ET ENVOI ---
  async generateAndSendCode(
    email: string,
    type: 'REGISTER' | 'PASSWORD_RESET',
  ): Promise<void> {
    const rawCode = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);

    await this.codeModel.deleteMany({ email, type });
    await this.codeModel.create({ email, code: hashedCode, type });

    // Définir dynamiquement le sujet et le fichier template à utiliser
    const isRegister = type === 'REGISTER';
    const subject = isRegister
      ? 'Activez votre compte'
      : 'Réinitialisation de votre mot de passe';
    const templateName = isRegister ? 'register' : 'reset-password'; // correspond aux fichiers .hbs

    // Envoi de l'email via template
    await this.mailerService.sendMail({
      to: email,
      subject: subject,
      template: templateName, // NestJS cherche automatiquement register.hbs ou reset-password.hbs
      context: {
        code: rawCode, // Variable injectée dans le fichier HTML via {{code}}
      },
    });
  }

  async sendVerificationCode(userId: string, email: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    if (user && user.isVerified) {
      return await this.generateAndSendCode(email, 'REGISTER');
    }

    throw new BadRequestException('Utilisateur introuvable');
  }

  // --- VÉRIFICATION POUR L'INSCRIPTION ---
  async verifyRegisterCode(email: string, code: string) {
    const record = await this.codeModel.findOne({
      email,
      type: 'REGISTER',
      isUsed: false,
    });

    if (!record) {
      throw new BadRequestException('Code introuvable ou expiré.');
    }

    // Comparer le code fourni avec le hash en BDD
    const isMatch = await bcrypt.compare(code, record.code);
    if (!isMatch) {
      throw new BadRequestException('Code incorrect.');
    }

    // Activer l'utilisateur et invalider le code
    await this.userModel.updateOne({ email }, { isActive: true });
    await this.codeModel.deleteOne({ _id: record._id }); // Suppression directe pour sécurité

    return { message: 'Compte activé avec succès.' };
  }

  // --- VÉRIFICATION POUR L'INSCRIPTION ---
  async verifyCode(email: string, code: string) {
    const record = await this.codeModel.findOne({
      email,
      type: 'PASSWORD_RESET',
      isUsed: false,
    });

    if (!record) {
      throw new BadRequestException('Code introuvable.');
    }

    // 1. AJOUT : Vérification stricte du temps d'expiration (15 minutes = 900 000 ms)
    const expirationTimeMs = 15 * 60 * 1000;
    const codeAgeMs = Date.now() - record.createdAt.getTime();

    if (codeAgeMs > expirationTimeMs) {
      throw new BadRequestException('Code expiré.');
    }

    // Comparer le code fourni avec le hash en BDD
    const isMatch = await bcrypt.compare(code, record.code);
    if (!isMatch) {
      throw new BadRequestException('Code invalide.');
    }

    // OPTIMISATION : Message cohérent avec la réinitialisation de mot de passe
    return { message: 'Code vérifié avec succès.', code: code };
  }

  // --- RÉINITIALISATION DU MOT DE PASSE ---
  async resetPassword(resetDto: ResetPasswordDto) {
    const { email, code, newPassword } = resetDto;

    // 1. Chercher le code en BDD (sans isUsed car on supprime le document après usage)
    const record = await this.codeModel.findOne({
      email,
      type: 'PASSWORD_RESET',
    });

    // 1. Vérifie si le document ET le code hashé existent bien en BDD
    if (!record || !record.code) {
      throw new BadRequestException('Code introuvable ou expiré.');
    }

    // 2. Vérifier si le code saisi correspond au hash en BDD
    const isMatch = await bcrypt.compare(code!, record.code);
    if (!isMatch) {
      throw new BadRequestException('Code incorrect.');
    }

    // 3. Hasher le nouveau mot de passe de l'utilisateur
    const hashedPassword = await bcrypt.hash(newPassword!, 10);

    // 4. Mettre à jour l'utilisateur et supprimer définitivement le code
    await this.userModel.updateOne({ email }, { password: hashedPassword });
    await this.codeModel.deleteOne({ _id: record._id });

    return { message: 'Mot de passe modifié avec succès.' };
  }
}
