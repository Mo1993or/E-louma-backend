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
import { StatsService } from 'src/modules/stats/stats.service';

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
    private readonly statsService: StatsService,
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
      seller: product.seller,
    });
    const productWasAvailable = product.status === ProductStatus.AVAILABLE;
    await this.productModel.updateOne(
      { _id: product._id },
      { $inc: { reservations: 1 }, status: ProductStatus.RESERVED },
    );
    if (product.seller) {
      await this.statsService.onReservationCreated(
        product.seller,
        productWasAvailable,
      );
    }

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
    // 1. Recherche du produit pour vérification des droits
    const product = await this.productModel.findById(
      new Types.ObjectId(validateReservationDto.product),
    );

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    // 2. Vérification que l'utilisateur est bien le vendeur
    if (product.seller?.toString() !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas valider ce produit car il ne vous appartient pas',
      );
    }

    // 3. Calcule le revenu (somme des réservations en cours pour ce produit,
    // gère les ventes par quantités partielles à plusieurs acheteurs) et le
    // fige sur le produit : les réservations peuvent être supprimées plus
    // tard (annulation, nettoyage), ce revenu doit donc survivre à leur suppression.
    let revenueAmount = product.soldRevenue ?? 0;
    if (product.status !== ProductStatus.SOLD) {
      const revenueResult = await this.reservationModel.aggregate<{
        total: number;
      }>([
        { $match: { product: product._id } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]);
      revenueAmount = revenueResult[0]?.total ?? 0;
    }

    // 4. Mise à jour et récupération du document modifié
    const updatedProduct = await this.productModel.findByIdAndUpdate(
      product._id,
      {
        $set: {
          status: ProductStatus.SOLD,
          soldAt: new Date(), // Ajoute la date et l'heure courantes
          soldRevenue: revenueAmount,
          price: validateReservationDto.price,
        },
      },
      { new: true },
    );

    if (product.status !== ProductStatus.SOLD && product.seller) {
      await this.statsService.onProductSold(
        product.seller,
        product.category,
        product.status,
        revenueAmount,
      );
    }

    return {
      message: 'Reservation validee avec succes',
      product: updatedProduct,
    };
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

    const productBecameAvailable = remainingReservations === 0;
    if (productBecameAvailable) {
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

    if (product.seller) {
      await this.statsService.onReservationCancelled(
        product.seller,
        productBecameAvailable,
      );
    }

    return { message: 'Reservation annulee avec succes' };
  }
}
