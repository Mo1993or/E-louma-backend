import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserProfile } from 'src/shared/enums/user-profile.enum';
import { UserStatus } from 'src/shared/enums/user-status.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
})
export class User {
  @Prop({
    required: true,
  })
  fullname!: string;

  @Prop({
    required: true,
    unique: true,
  })
  email!: string;

  @Prop({
    required: true,
    unique: true,
  })
  phonenumber!: string;

  @Prop({
    required: true,
  })
  password!: string;

  @Prop({
    type: String,
    enum: Object.values(UserProfile),
    default: UserProfile.USER,
  })
  role!: UserProfile;

  @Prop({
    default: false,
  })
  isVerified!: boolean;

  @Prop({
    required: false,
  })
  avatar?: string;

  @Prop({
    required: false,
  })
  fcmToken?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ENABLED,
    required: false,
  })
  status?: UserStatus;
}

export const UserSchema = SchemaFactory.createForClass(User);
