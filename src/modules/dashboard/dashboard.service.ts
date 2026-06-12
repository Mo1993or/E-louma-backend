import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Model } from 'mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../reservation/schemas/reservation.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
  ) {}

  async getDashboard(userId: string) {
    //Total vente
  }
}
