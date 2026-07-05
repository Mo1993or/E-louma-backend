import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { firebaseAdminProvider } from './firebase-admin.provider';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [firebaseAdminProvider, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
