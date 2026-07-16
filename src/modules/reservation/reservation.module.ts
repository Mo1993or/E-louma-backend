import { Module } from '@nestjs/common';
import { ReservationService } from './services/reservation/reservation.service';
import { ReservationController } from './controller/reservation/reservation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Reservation.name,
        schema: ReservationSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    StatsModule,
  ],
  providers: [ReservationService],
  controllers: [ReservationController],
})
export class ReservationModule {}
