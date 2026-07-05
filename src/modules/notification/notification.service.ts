/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { App } from 'firebase-admin/app';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
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
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
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

  /**
   * Persiste une notification pour un utilisateur et tente en plus
   * l'envoi push si un token FCM est enregistré (best-effort).
   */
  async notifyUser(
    recipientId: string,
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, string> = {},
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create({
      recipient: new Types.ObjectId(recipientId),
      title,
      body,
      type,
    });

    const recipient = await this.userModel.findById(recipientId).lean();
    if (recipient?.fcmToken) {
      await this.sendToDevice(recipient.fcmToken, title, body, type, data);
    }

    return notification;
  }

  /**
   * Liste paginée des notifications d'un utilisateur, triées par date décroissante.
   */
  async listForUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const filter: Record<string, unknown> = { recipient: userId };
    if (unreadOnly) filter.read = false;

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Nombre de notifications non lues d'un utilisateur.
   */
  async countUnread(userId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({
      recipient: userId,
      read: false,
    });
    return { count };
  }

  /**
   * Marque une notification comme lue.
   */
  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true },
    );
    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }
    return notification;
  }

  /**
   * Marque toutes les notifications non lues d'un utilisateur comme lues.
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() },
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Supprime une notification appartenant à l'utilisateur.
   */
  async deleteOne(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      recipient: userId,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification introuvable');
    }
  }

  /**
   * Supprime toutes les notifications d'un utilisateur.
   */
  async deleteAllForUser(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.notificationModel.deleteMany({
      recipient: userId,
    });
    return { deletedCount: result.deletedCount };
  }
}
