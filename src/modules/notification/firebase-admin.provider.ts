import { initializeApp, cert, App } from 'firebase-admin/app';
import { ConfigService } from '@nestjs/config';

export const firebaseAdminProvider = {
  provide: 'FIREBASE_ADMIN',
  inject: [ConfigService], // 1. Indique à NestJS d'injecter la dépendance
  useFactory: (configService: ConfigService): { defaultApp: App } => {
    // 2. Récupère l'instance ici
    const defaultApp = initializeApp({
      credential: cert({
        projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        privateKey: configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
      }),
    });

    return { defaultApp };
  },
};
