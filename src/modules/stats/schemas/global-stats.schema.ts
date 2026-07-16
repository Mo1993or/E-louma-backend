import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GlobalStatsDocument = HydratedDocument<GlobalStats>;

export const GLOBAL_STATS_KEY = 'global';

@Schema({ timestamps: true })
export class GlobalStats {
  @Prop({ type: String, default: GLOBAL_STATS_KEY, unique: true })
  key!: string;

  @Prop({ type: Number, default: 0, min: 0 })
  totalUsers!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalProducts!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalReservations!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalSold!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalRevenue!: number;

  @Prop({ type: Date })
  lastRecalculatedAt?: Date;
}

export const GlobalStatsSchema = SchemaFactory.createForClass(GlobalStats);
