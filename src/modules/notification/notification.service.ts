/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { App } from 'firebase-admin/app';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  SendNotificationDto,
  NotificationType,
} from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly messaging: Messaging;

  // Configuration par défaut partagée pour éviter la réallocation d'objets en mémoire
  private readonly baseConfig = {
    android: {
      priority: 'high' as const,
      notification: { sound: 'default', channelId: 'default' },
    },
    apns: {
      payload: { aps: { contentAvailable: true, sound: 'default' } },
    },
  };

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseAdmin: { defaultApp: App },
  ) {
    // Initialisation sécurisée une fois que la dépendance est bien injectée
    this.messaging = getMessaging(this.firebaseAdmin.defaultApp);
  }

  /**
   * Envoie une notification à un seul appareil
   */
  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, string> = {},
  ): Promise<boolean> {
    if (!fcmToken || fcmToken.length < 20) {
      this.logger.warn(`Token FCM invalide ou trop court: "${fcmToken}"`);
      return false;
    }

    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        data: {
          ...data,
          type: String(type),
        },
        ...this.baseConfig,
      });

      this.logger.log(`Notification envoyée à l'appareil: "${title}"`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Échec envoi notification à l'appareil: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Envoie des notifications en masse (Multicast)
   */
  async sendToMultipleDevices(
    fcmTokens: string[],
    title: string,
    body: string,
    type: NotificationType, // Ajout du type obligatoire
    data: Record<string, string> = {},
  ): Promise<void> {
    if (!fcmTokens?.length) return;

    try {
      await this.messaging.sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data: {
          ...data,
          type: String(type), // Conversion et fusion sécurisée pour Firebase
        },
        ...this.baseConfig,
      });
      this.logger.log(
        `Notification multicast envoyée à ${fcmTokens.length} appareils: "${title}"`,
      );
    } catch (error: any) {
      this.logger.error(
        `Échec envoi notifications multicast: ${error.message}`,
      );
    }
  }

  /**
   * Envoie une notification basée sur le DTO
   */
  async sendPush(notification: SendNotificationDto): Promise<void> {
    const success = await this.sendToDevice(
      notification.targetUserId,
      notification.title,
      notification.body,
      notification.type, // Passé correctement en 4ème argument sans conflit de type
    );

    if (!success) {
      throw new Error(`L'envoi du push DTO a échoué.`);
    }
  }
}
