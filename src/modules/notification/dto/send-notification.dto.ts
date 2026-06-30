import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum NotificationType {
  ORDER = 'order',
  PAYMENT = 'payment',
  WARNING = 'warning',
  MESSAGE = 'message',
  SUCCESS = 'success',
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsString()
  @IsOptional()
  targetUserId!: string;

  @IsEnum(NotificationType, {
    message:
      'Le type de notification doit être : promotion, alert, transactional ou chat',
  })
  @IsNotEmpty()
  type!: NotificationType;
}
