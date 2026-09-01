import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PlanType } from 'src/shared/enums/plan-type.enum';

export type PlanDocument = HydratedDocument<Plan>;

@Schema({
  timestamps: true,
})
export class Plan {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true, enum: PlanType, default: PlanType.BASIC })
  type!: PlanType;

  @Prop({ required: true, default: 30 })
  durationInDays!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
