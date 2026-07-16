import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { VendorStats, VendorStatsSchema } from './schemas/vendor-stats.schema';
import { GlobalStats, GlobalStatsSchema } from './schemas/global-stats.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  Reservation,
  ReservationSchema,
} from '../reservation/schemas/reservation.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorStats.name, schema: VendorStatsSchema },
      { name: GlobalStats.name, schema: GlobalStatsSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Reservation.name, schema: ReservationSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
