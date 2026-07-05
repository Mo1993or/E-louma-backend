import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationType } from '../dto/send-notification.dto';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  timestamps: true,
})
export class Notification {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipient!: Types.ObjectId;

  @Prop({
    required: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  body!: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
  })
  type!: NotificationType;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  read!: boolean;

  @Prop({
    required: false,
  })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
