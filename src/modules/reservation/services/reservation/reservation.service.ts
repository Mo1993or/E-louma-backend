import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../../schemas/reservation.schema';
import { Model, Types } from 'mongoose';
import { CreateReservationDto } from '../../dto/create-reservation.dto';
import {
  Product,
  ProductDocument,
} from 'src/modules/products/schemas/product.schema';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async addReservation(createReservationDto: CreateReservationDto) {
    const reservation = await this.reservationModel.create({
      ...createReservationDto,
    });

    await this.productModel.updateOne(
      {
        _id: new Types.ObjectId(createReservationDto.product),
      },
      { $inc: { reservations: 1 } },
    );
    return {
      message: 'Réservation effectué',
      reservation,
    };
  }

  async findUsersReservation(productId: string) {
    return await this.reservationModel
      .find({
        product: productId,
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
