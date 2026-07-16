import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VendorStatsDocument = HydratedDocument<VendorStats>;

export interface MonthlyTrendEntry {
  reservations: number;
  revenue: number;
}

export interface CategoryBreakdownEntry {
  count: number;
  revenue: number;
}

@Schema({ timestamps: true })
export class VendorStats {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  seller!: Types.ObjectId;

  @Prop({ type: Number, default: 0, min: 0 })
  totalProducts!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalAvailable!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalReserved!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalSold!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalReservations!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalRevenue!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalViews!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalFavorites!: number;

  // Clé "YYYY-MM"
  @Prop({
    type: Map,
    of: raw({
      reservations: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    }),
    default: {},
  })
  monthlyTrend!: Map<string, MonthlyTrendEntry>;

  // Clé = categoryId (string). Le nom de la catégorie est résolu à la lecture.
  @Prop({
    type: Map,
    of: raw({
      count: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    }),
    default: {},
  })
  categoryBreakdown!: Map<string, CategoryBreakdownEntry>;

  @Prop({ type: Date })
  lastRecalculatedAt?: Date;
}

export const VendorStatsSchema = SchemaFactory.createForClass(VendorStats);
