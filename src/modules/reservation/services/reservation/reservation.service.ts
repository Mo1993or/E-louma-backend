import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../../schemas/reservation.schema';
import { Model, Types } from 'mongoose';
import { CreateReservationDto } from '../../dto/create-reservation.dto';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
  ) {}

  async addReservation(createReservationDto: CreateReservationDto) {
    const reservation = await this.reservationModel.create({
      ...createReservationDto,
    });
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
