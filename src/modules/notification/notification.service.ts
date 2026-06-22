import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private messaging: Messaging | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (getApps().length === 0) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials manquantes — notifications desactivees',
        );
        return;
      }

      const app = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
      this.messaging = getMessaging(app);
      this.logger.log('Firebase initialise');
    } else {
      this.messaging = getMessaging();
    }
  }

  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging) return;
    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        data,
      });
    } catch (error: any) {
      this.logger.error(`Echec envoi notification: ${error.message}`);
    }
  }

  async sendToMultipleDevices(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging || fcmTokens.length === 0) return;
    try {
      await this.messaging.sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data,
      });
    } catch (error: any) {
      this.logger.error(`Echec envoi notifications: ${error.message}`);
    }
  }
}
