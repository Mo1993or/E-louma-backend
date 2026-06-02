import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type VerificationCodeDocument = HydratedDocument<VerificationCode>;

@Schema({ timestamps: true })
export class VerificationCode {
  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  code!: string; // Stockez le code hashé ici

  @Prop({ required: true, enum: ['REGISTER', 'PASSWORD_RESET'] })
  type!: string;

  @Prop({ default: false })
  isUsed?: boolean;

  // Index TTL : Supprime automatiquement le document 15 minutes après sa création
  @Prop({ default: Date.now, expires: 900 })
  createdAt!: Date;
}

export const VerificationCodeSchema =
  SchemaFactory.createForClass(VerificationCode);
