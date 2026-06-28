/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { User, UserDocument } from '../auth/schemas/user.schema';

const INVALID_TOKEN_CODES = [
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/third-party-auth-error',
];

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private messaging: Messaging | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  onModuleInit() {
    if (getApps().length !== 0) {
      this.messaging = getMessaging();
      return;
    }

    const credentialsPath = this.configService.get<string>(
      'GOOGLE_APPLICATION_CREDENTIALS',
      join(process.cwd(), 'google-credentials.json'),
    );

    if (existsSync(credentialsPath)) {
      try {
        const serviceAccount = JSON.parse(
          readFileSync(credentialsPath, 'utf-8'),
        );
        const app = initializeApp({
          credential: cert(serviceAccount),
        });
        this.messaging = getMessaging(app);
        console.log('Firebase initialise depuis le fichier credentials');
        this.logger.log('Firebase initialise depuis le fichier credentials');
        return;
      } catch (error: any) {
        this.logger.error(`Erreur lecture credentials: ${error.message}`);
        console.error(`Erreur lecture credentials: ${error.message}`);
      }
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
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
    this.logger.log('Firebase initialise depuis les variables env');
    console.log('Firebase initialise depuis les variables env');
  }

  async sendToDevice(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.messaging) {
      this.logger.warn('Firebase non initialise — notification ignoree');
      return false;
    }
    if (!fcmToken || fcmToken.length < 20) {
      this.logger.warn(`Token FCM invalide ou trop court: "${fcmToken}"`);
      return false;
    }
    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        data,
      });
      this.logger.log(`Notification envoyee: "${title}"`);
      return true;
    } catch (error: any) {
      this.logger.error(`Echec envoi notification: ${error.message}`);
      if (INVALID_TOKEN_CODES.includes(error.code)) {
        this.logger.warn(`Token FCM invalide, nettoyage du token en base...`);
        await this.userModel.updateMany(
          { fcmToken },
          { $unset: { fcmToken: '' } },
        );
      }
      return false;
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
