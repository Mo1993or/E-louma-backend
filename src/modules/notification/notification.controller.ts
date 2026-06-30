/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import {
  NotificationType,
  SendNotificationDto,
} from './dto/send-notification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Model, Types } from 'mongoose';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('send')
  async sendNotification(
    @Body() dto: SendNotificationDto,
    @Request() req: any,
  ) {
    let targetFcmToken: string | undefined;

    if (dto.targetUserId) {
      const targetUser = await this.userModel
        .findById(new Types.ObjectId(dto.targetUserId))
        .lean();
      if (!targetUser)
        throw new NotFoundException('Utilisateur cible introuvable');
      targetFcmToken = targetUser.fcmToken;
    } else {
      const currentUser = await this.userModel
        .findById(new Types.ObjectId(req.user.sub))
        .lean();
      if (!currentUser) throw new NotFoundException('Utilisateur introuvable');
      targetFcmToken = currentUser.fcmToken;
    }

    if (!targetFcmToken) {
      return {
        success: false,
        message: "L'utilisateur n'a pas de token FCM enregistre",
      };
    }

    const sent = await this.notificationService.sendToDevice(
      targetFcmToken,
      dto.title,
      dto.body,
      NotificationType.MESSAGE,
    );

    if (!sent) {
      return {
        success: false,
        message:
          "Echec de l'envoi. Le token FCM est peut-etre invalide ou expire. L'utilisateur doit se reconnecter depuis l'application.",
      };
    }

    return { success: true, message: 'Notification envoyee avec succes' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-to-self')
  async sendToSelf(@Request() req: any) {
    const user = await this.userModel
      .findById(new Types.ObjectId(req.user.sub))
      .lean();
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (!user.fcmToken) {
      return {
        success: false,
        message:
          "Aucun token FCM enregistre. Mettez a jour votre token FCM via l'endpoint PUT /api/v1/auth/fcm-token.",
      };
    }

    const sent = await this.notificationService.sendToDevice(
      user.fcmToken,
      'Connexion reussie',
      `Bienvenue ${user.fullname} ! Vous etes maintenant connecte a E-Louma.`,
      NotificationType.SUCCESS,
    );

    if (!sent) {
      return {
        success: false,
        message:
          "Token FCM invalide ou expire. Mettez a jour votre token FCM depuis l'application.",
      };
    }

    return { success: true, message: 'Notification de connexion envoyee' };
  }

  @Post('test-notification')
  async testSendNotification(@Body() pushNotification: SendNotificationDto) {
    await this.notificationService.sendPush(pushNotification);
  }
}
