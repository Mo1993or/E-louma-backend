import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../../schemas/reservation.schema';
import { Model, Types } from 'mongoose';
import {
  CreateReservationDto,
  ValidateReservationDto,
} from '../../dto/create-reservation.dto';
import {
  Product,
  ProductDocument,
} from 'src/modules/products/schemas/product.schema';
import { ProductStatus } from 'src/shared/enums/product.enums';

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

  async validate(
    validateReservationDto: ValidateReservationDto,
    userId: string,
  ) {
    const reservation = await this.reservationModel.findById(
      new Types.ObjectId(validateReservationDto.reservationId),
    );

    if (reservation) {
      //Verification des information du vendeur
      const product = await this.productModel.findById(
        new Types.ObjectId(reservation.product),
      );
      if (product) {
        if (product.seller?.toString() === userId) {
          this.productModel.updateOne(
            {
              _id: product._id,
            },
            {
              status: ProductStatus.SOLD,
            },
          );
          return {
            message: 'Réservation validé avec succès',
            product,
          };
        }
        throw new BadRequestException(
          'Vous ne pouvez pas valider ce produit car il ne vous appartient pas',
        );
      }
      throw new NotFoundException(`Une erreur s'est produite`);
    }
    throw new NotFoundException('Réservation introuvable');
  }
}
