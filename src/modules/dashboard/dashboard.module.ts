import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import {
  Reservation,
  ReservationSchema,
} from '../reservation/schemas/reservation.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  Categorie,
  CategorieSchema,
} from '../categories/schemas/categorie.schema';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Reservation.name, schema: ReservationSchema },
      { name: User.name, schema: UserSchema },
      { name: Categorie.name, schema: CategorieSchema },
    ]),
    StatsModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
