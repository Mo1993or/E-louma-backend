/* eslint-disable @typescript-eslint/no-floating-promises */

import {
  BadRequestException,
  ForbiddenException,
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
import { User, UserDocument } from 'src/modules/auth/schemas/user.schema';
import { ProductStatus } from 'src/shared/enums/product.enums';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/modules/notification/dto/send-notification.dto';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async addReservation(createReservationDto: CreateReservationDto) {
    const product = await this.productModel.findById(
      new Types.ObjectId(createReservationDto.product),
    );
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.status !== ProductStatus.AVAILABLE) {
      throw new BadRequestException('Ce produit nest plus disponible');
    }
    const reservation = await this.reservationModel.create({
      ...createReservationDto,
    });
    await this.productModel.updateOne(
      { _id: product._id },
      { $inc: { reservations: 1 }, status: ProductStatus.RESERVED },
    );

    const seller = await this.userModel.findById(product.seller).lean();
    if (seller?.fcmToken) {
      this.notificationService.sendToDevice(
        seller.fcmToken,
        'Nouvelle reservation',
        `${createReservationDto.fullname} a reserve votre produit "${product.title}"`,
        NotificationType.SUCCESS,
      );
    }

    return { message: 'Reservation effectuee', reservation };
  }

  async findUsersReservation(productId: string) {
    return this.reservationModel
      .find({ product: productId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSellerReservations(userId: string) {
    const products = await this.productModel
      .find({ seller: new Types.ObjectId(userId) })
      .select('_id')
      .lean();
    const productIds = products.map((p) => p._id);
    return this.reservationModel
      .find({ product: { $in: productIds } })
      .populate('product', 'title price images status')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getBuyerReservations(userId: string) {
    return this.reservationModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' },
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
    if (!reservation) throw new NotFoundException('Reservation introuvable');

    const product = await this.productModel.findById(
      new Types.ObjectId(reservation.product),
    );
    if (!product) throw new NotFoundException('Une erreur sest produite');

    if (product.seller?.toString() !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas valider ce produit car il ne vous appartient pas',
      );
    }
    await this.productModel.updateOne(
      { _id: product._id },
      { status: ProductStatus.SOLD },
    );

    if (reservation.user) {
      const buyer = await this.userModel.findById(reservation.user).lean();
      if (buyer?.fcmToken) {
        this.notificationService.sendToDevice(
          buyer.fcmToken,
          'Reservation confirmee',
          `Votre reservation pour "${product.title}" a ete validee par le vendeur`,
          NotificationType.SUCCESS,
        );
      }
    }

    return { message: 'Reservation validee avec succes', product };
  }

  async cancelReservation(reservationId: string, userId: string) {
    const reservation = await this.reservationModel.findById(
      new Types.ObjectId(reservationId),
    );
    if (!reservation) throw new NotFoundException('Reservation introuvable');

    const product = await this.productModel.findById(reservation.product);
    if (!product) throw new NotFoundException('Produit introuvable');

    const isSeller = product.seller?.toString() === userId;
    const isBuyer = reservation.user?.toString() === userId;

    if (!isSeller && !isBuyer) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits pour annuler cette reservation",
      );
    }

    await this.reservationModel.findByIdAndDelete(
      new Types.ObjectId(reservationId),
    );

    if (isSeller && reservation.user) {
      const buyer = await this.userModel.findById(reservation.user).lean();
      if (buyer?.fcmToken) {
        this.notificationService.sendToDevice(
          buyer.fcmToken,
          'Reservation annulee',
          `Le vendeur a annule votre reservation pour "${product.title}"`,
          NotificationType.MESSAGE,
        );
      }
    } else if (isBuyer) {
      const seller = await this.userModel.findById(product.seller).lean();
      if (seller?.fcmToken) {
        this.notificationService.sendToDevice(
          seller.fcmToken,
          'Reservation annulee',
          `Un acheteur a annule sa reservation pour "${product.title}"`,
          NotificationType.MESSAGE,
        );
      }
    }

    const remainingReservations = await this.reservationModel.countDocuments({
      product: product._id,
    });

    if (remainingReservations === 0) {
      await this.productModel.updateOne(
        { _id: product._id },
        { status: ProductStatus.AVAILABLE, $inc: { reservations: -1 } },
      );
    } else {
      await this.productModel.updateOne(
        { _id: product._id },
        { $inc: { reservations: -1 } },
      );
    }

    return { message: 'Reservation annulee avec succes' };
  }
}
