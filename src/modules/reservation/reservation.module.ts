import { Module } from '@nestjs/common';
import { ReservationService } from './services/reservation/reservation.service';
import { ReservationController } from './controller/reservation/reservation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

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
    ]),
  ],
  providers: [ReservationService],
  controllers: [ReservationController],
})
export class ReservationModule {}
