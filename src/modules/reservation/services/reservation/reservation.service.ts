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
  /**
   * Construit le service et injecte les modèles Mongoose ainsi que les dépendances utiles.
   */
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Ajoute une réservation pour un produit.
   *
   * - Vérifie l'existence du produit
   * - Vérifie que le produit est disponible
   * - Crée l'objet de réservation
   * - Met à jour le compteur et le statut du produit
   * - Notifie le vendeur (si un token FCM est disponible)
   */
  async addReservation(createReservationDto: CreateReservationDto) {
    const product = await this.productModel.findById(
      new Types.ObjectId(createReservationDto.product),
    );
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException(
        'Ce produit nest plus disponible pour la vente',
      );
    }
    const reservation = await this.reservationModel.create({
      ...createReservationDto,
    });
    await this.productModel.updateOne(
      { _id: product._id },
      { $inc: { reservations: 1 }, status: ProductStatus.RESERVED },
    );

    const seller = await this.userModel.findById(product.seller).lean();
    if (seller) {
      this.notificationService.notifyUser(
        String(seller._id),
        'Nouvelle reservation',
        `${createReservationDto.fullname} a reserve votre produit "${product.title}"`,
        NotificationType.SUCCESS,
      );
    }

    return { message: 'Reservation effectuee', reservation };
  }

  /**
   * Récupère la liste des réservations associées à un produit.
   * Les résultats sont triés par date de création décroissante.
   */
  async findUsersReservation(productId: string) {
    return this.reservationModel
      .find({ product: productId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Récupère les réservations pour tous les produits du vendeur.
   *
   * Le vendeur est identifié par son ID MongoDB.
   * Les réservations sont retournées avec le produit peuplé (title, price, images, status).
   */
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

  /**
   * Récupère les réservations d'un acheteur.
   *
   * Les produits sont peuplés avec leur catégorie (name).
   * Les résultats sont triés par date de création décroissante.
   */
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

  /**
   * Valide une réservation côté vendeur.
   *
   * Vérifie l'existence de la réservation et du produit.
   * Contrôle que le vendeur connecté correspond au vendeur du produit.
   * Met ensuite le produit à l'état SOLD et notifie l'acheteur (si possible).
   */
  async validate(
    validateReservationDto: ValidateReservationDto,
    userId: string,
  ) {
    const product = await this.productModel.findById(
      new Types.ObjectId(validateReservationDto.product),
    );
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.seller?.toString() !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas valider ce produit car il ne vous appartient pas',
      );
    }
    await this.productModel.updateOne(
      { _id: product._id },
      { status: ProductStatus.SOLD },
    );

    return { message: 'Reservation validee avec succes', product };
  }

  /**
   * Annule une réservation.
   *
   * Uniquement le vendeur du produit ou l'acheteur ayant créé la réservation peut annuler.
   *
   * Après suppression de la réservation, le statut du produit et le compteur `reservations`
   * sont mis à jour selon le nombre de réservations restantes.
   */
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
      if (buyer) {
        this.notificationService.notifyUser(
          String(buyer._id),
          'Reservation annulee',
          `Le vendeur a annule votre reservation pour "${product.title}"`,
          NotificationType.MESSAGE,
        );
      }
    } else if (isBuyer) {
      const seller = await this.userModel.findById(product.seller).lean();
      if (seller) {
        this.notificationService.notifyUser(
          String(seller._id),
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
