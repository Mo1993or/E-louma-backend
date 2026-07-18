import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VendorStats,
  VendorStatsDocument,
  MonthlyTrendEntry,
  CategoryBreakdownEntry,
} from './schemas/vendor-stats.schema';
import {
  GlobalStats,
  GlobalStatsDocument,
  GLOBAL_STATS_KEY,
} from './schemas/global-stats.schema';

export interface VendorStatsPlain {
  seller: Types.ObjectId;
  totalProducts: number;
  totalAvailable: number;
  totalReserved: number;
  totalSold: number;
  totalReservations: number;
  totalRevenue: number;
  totalViews: number;
  totalFavorites: number;
  monthlyTrend: Record<string, MonthlyTrendEntry>;
  categoryBreakdown: Record<string, CategoryBreakdownEntry>;
  lastRecalculatedAt?: Date;
}

export interface GlobalStatsPlain {
  totalUsers: number;
  totalProducts: number;
  totalReservations: number;
  totalSold: number;
  totalRevenue: number;
  lastRecalculatedAt?: Date;
}
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  Reservation,
  ReservationDocument,
} from '../reservation/schemas/reservation.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { ProductStatus } from 'src/shared/enums/product.enums';

function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function statusField(status: ProductStatus): string | null {
  switch (status) {
    case ProductStatus.AVAILABLE:
      return 'totalAvailable';
    case ProductStatus.RESERVED:
      return 'totalReserved';
    case ProductStatus.SOLD:
      return 'totalSold';
    default:
      return null;
  }
}

/**
 * Centralise la lecture/écriture des statistiques agrégées (par vendeur et globales).
 * Les compteurs sont mis à jour de façon incrémentale par les modules métier
 * (products, reservation, favoris, auth) au moment de chaque mutation, afin que
 * le dashboard n'ait plus jamais à recalculer quoi que ce soit à la lecture.
 */
@Injectable()
export class StatsService {
  constructor(
    @InjectModel(VendorStats.name)
    private readonly vendorStatsModel: Model<VendorStatsDocument>,
    @InjectModel(GlobalStats.name)
    private readonly globalStatsModel: Model<GlobalStatsDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ---------------------------------------------------------------------
  // Lecture
  // ---------------------------------------------------------------------

  async getVendorStats(
    sellerId: Types.ObjectId | string,
  ): Promise<VendorStatsPlain> {
    const seller = new Types.ObjectId(sellerId);
    const stats = await this.vendorStatsModel
      .findOne({ seller })
      .lean({ flattenMaps: true });
    if (stats) return stats as unknown as VendorStatsPlain;
    return this.recalculateVendorStats(seller);
  }

  async getGlobalStats(): Promise<GlobalStatsPlain> {
    const stats = await this.globalStatsModel
      .findOne({ key: GLOBAL_STATS_KEY })
      .lean({ flattenMaps: true });
    if (stats) return stats;
    return this.recalculateGlobalStats();
  }

  // ---------------------------------------------------------------------
  // Hooks produits
  // ---------------------------------------------------------------------

  async onProductCreated(sellerId: Types.ObjectId, categoryId: Types.ObjectId) {
    await this.vendorStatsModel.updateOne(
      { seller: sellerId },
      {
        $inc: {
          totalProducts: 1,
          totalAvailable: 1,
          [`categoryBreakdown.${categoryId.toString()}.count`]: 1,
        },
        $setOnInsert: { seller: sellerId },
      },
      { upsert: true },
    );
    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      { $inc: { totalProducts: 1 } },
      { upsert: true },
    );
  }

  async onProductDeleted(
    sellerId: Types.ObjectId,
    categoryId: Types.ObjectId,
    status: ProductStatus,
    soldRevenue?: number,
  ) {
    const field = statusField(status);
    const inc: Record<string, number> = {
      totalProducts: -1,
      [`categoryBreakdown.${categoryId.toString()}.count`]: -1,
    };
    if (field) inc[field] = -1;
    if (status === ProductStatus.SOLD && soldRevenue) {
      inc.totalRevenue = -soldRevenue;
      inc[`categoryBreakdown.${categoryId.toString()}.revenue`] =
        -soldRevenue;
    }

    await this.vendorStatsModel.updateOne({ seller: sellerId }, { $inc: inc });
    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      {
        $inc: {
          totalProducts: -1,
          ...(status === ProductStatus.SOLD
            ? { totalSold: -1, totalRevenue: -(soldRevenue ?? 0) }
            : {}),
        },
      },
    );
  }

  /** Changement de statut hors flux de vente (ex: édition manuelle du produit). */
  async onProductStatusChanged(
    sellerId: Types.ObjectId,
    oldStatus: ProductStatus,
    newStatus: ProductStatus,
  ) {
    if (oldStatus === newStatus) return;
    const oldField = statusField(oldStatus);
    const newField = statusField(newStatus);
    const inc: Record<string, number> = {};
    if (oldField) inc[oldField] = -1;
    if (newField) inc[newField] = (inc[newField] ?? 0) + 1;

    await this.vendorStatsModel.updateOne({ seller: sellerId }, { $inc: inc });

    const globalDelta =
      (newStatus === ProductStatus.SOLD ? 1 : 0) -
      (oldStatus === ProductStatus.SOLD ? 1 : 0);
    if (globalDelta !== 0) {
      await this.globalStatsModel.updateOne(
        { key: GLOBAL_STATS_KEY },
        { $inc: { totalSold: globalDelta } },
      );
    }
  }

  async onProductCategoryChanged(
    sellerId: Types.ObjectId,
    oldCategoryId: Types.ObjectId,
    newCategoryId: Types.ObjectId,
  ) {
    if (oldCategoryId.toString() === newCategoryId.toString()) return;
    await this.vendorStatsModel.updateOne(
      { seller: sellerId },
      {
        $inc: {
          [`categoryBreakdown.${oldCategoryId.toString()}.count`]: -1,
          [`categoryBreakdown.${newCategoryId.toString()}.count`]: 1,
        },
      },
    );
  }

  async onProductViewed(sellerId: Types.ObjectId) {
    await this.vendorStatsModel.updateOne(
      { seller: sellerId },
      { $inc: { totalViews: 1 } },
    );
  }

  /**
   * Le produit passe à l'état "vendu" (flux de validation d'une réservation).
   * `revenueAmount` est la somme des prix des réservations en cours pour ce produit.
   */
  async onProductSold(
    sellerId: Types.ObjectId,
    categoryId: Types.ObjectId,
    oldStatus: ProductStatus,
    revenueAmount: number,
  ) {
    const oldField = statusField(oldStatus);
    const inc: Record<string, number> = {
      totalSold: 1,
      totalRevenue: revenueAmount,
      [`categoryBreakdown.${categoryId.toString()}.revenue`]: revenueAmount,
      [`monthlyTrend.${monthKey()}.revenue`]: revenueAmount,
    };
    if (oldField && oldField !== 'totalSold') inc[oldField] = -1;

    await this.vendorStatsModel.updateOne({ seller: sellerId }, { $inc: inc });
    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      { $inc: { totalSold: 1, totalRevenue: revenueAmount } },
    );
  }

  // ---------------------------------------------------------------------
  // Hooks réservations
  // ---------------------------------------------------------------------

  async onReservationCreated(
    sellerId: Types.ObjectId,
    productBecameReserved: boolean,
  ) {
    const inc: Record<string, number> = {
      totalReservations: 1,
      [`monthlyTrend.${monthKey()}.reservations`]: 1,
    };
    if (productBecameReserved) {
      inc.totalAvailable = -1;
      inc.totalReserved = 1;
    }
    await this.vendorStatsModel.updateOne(
      { seller: sellerId },
      { $inc: inc, $setOnInsert: { seller: sellerId } },
      { upsert: true },
    );
    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      { $inc: { totalReservations: 1 } },
      { upsert: true },
    );
  }

  async onReservationCancelled(
    sellerId: Types.ObjectId,
    productBecameAvailable: boolean,
  ) {
    const inc: Record<string, number> = { totalReservations: -1 };
    if (productBecameAvailable) {
      inc.totalReserved = -1;
      inc.totalAvailable = 1;
    }
    await this.vendorStatsModel.updateOne({ seller: sellerId }, { $inc: inc });
    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      { $inc: { totalReservations: -1 } },
    );
  }

  // ---------------------------------------------------------------------
  // Hooks favoris
  // ---------------------------------------------------------------------

  async onFavoriteChanged(sellerId: Types.ObjectId, delta: 1 | -1) {
    await this.vendorStatsModel.updateOne(
      { seller: sellerId },
      { $inc: { totalFavorites: delta } },
    );
  }

  // ---------------------------------------------------------------------
  // Hooks utilisateurs
  // ---------------------------------------------------------------------

  async onUserRegistered() {
    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      { $inc: { totalUsers: 1 } },
      { upsert: true },
    );
  }

  // ---------------------------------------------------------------------
  // Réconciliation (recalcul complet depuis les collections source)
  // ---------------------------------------------------------------------

  async recalculateVendorStats(
    sellerId: Types.ObjectId | string,
  ): Promise<VendorStatsPlain> {
    const seller = new Types.ObjectId(sellerId);

    const products = await this.productModel
      .find({ seller })
      .select(
        'category price status views favoritesCount soldAt soldRevenue',
      )
      .lean();
    const productIds = products.map((p) => p._id);

    const totalProducts = products.length;
    const totalAvailable = products.filter(
      (p) => p.status === ProductStatus.AVAILABLE,
    ).length;
    const totalReserved = products.filter(
      (p) => p.status === ProductStatus.RESERVED,
    ).length;
    const totalSold = products.filter(
      (p) => p.status === ProductStatus.SOLD,
    ).length;
    const totalViews = products.reduce((acc, p) => acc + (p.views ?? 0), 0);
    const totalFavorites = products.reduce(
      (acc, p) => acc + (p.favoritesCount ?? 0),
      0,
    );

    const reservations = (await this.reservationModel
      .find({ product: { $in: productIds } })
      .select('product price createdAt')
      .lean()) as unknown as {
      product: Types.ObjectId;
      price: number;
      createdAt: Date;
    }[];
    const totalReservations = reservations.length;

    // Le revenu est dérivé de `product.soldRevenue`/`soldAt` (figés au moment
    // de la vente) et non des réservations en base : celles-ci peuvent être
    // supprimées après la vente (annulation, nettoyage), ce qui effacerait à
    // tort le revenu historique si on le recalculait à partir d'elles.
    let totalRevenue = 0;
    const categoryBreakdown: Record<
      string,
      { count: number; revenue: number }
    > = {};
    for (const p of products) {
      const catId = p.category?.toString();
      if (!catId) continue;
      if (!categoryBreakdown[catId]) {
        categoryBreakdown[catId] = { count: 0, revenue: 0 };
      }
      categoryBreakdown[catId].count += 1;
    }

    const monthlyTrend: Record<
      string,
      { reservations: number; revenue: number }
    > = {};
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    for (const p of products) {
      if (p.status !== ProductStatus.SOLD || !p.soldRevenue) continue;
      totalRevenue += p.soldRevenue;
      const catId = p.category?.toString();
      if (catId) {
        if (!categoryBreakdown[catId]) {
          categoryBreakdown[catId] = { count: 0, revenue: 0 };
        }
        categoryBreakdown[catId].revenue += p.soldRevenue;
      }
      if (p.soldAt && p.soldAt >= twelveMonthsAgo) {
        const key = monthKey(p.soldAt);
        if (!monthlyTrend[key])
          monthlyTrend[key] = { reservations: 0, revenue: 0 };
        monthlyTrend[key].revenue += p.soldRevenue;
      }
    }

    for (const r of reservations) {
      const createdAt = r.createdAt;
      if (createdAt && createdAt >= twelveMonthsAgo) {
        const key = monthKey(createdAt);
        if (!monthlyTrend[key])
          monthlyTrend[key] = { reservations: 0, revenue: 0 };
        monthlyTrend[key].reservations += 1;
      }
    }

    const update = {
      seller,
      totalProducts,
      totalAvailable,
      totalReserved,
      totalSold,
      totalReservations,
      totalRevenue,
      totalViews,
      totalFavorites,
      monthlyTrend,
      categoryBreakdown,
      lastRecalculatedAt: new Date(),
    };

    await this.vendorStatsModel.updateOne(
      { seller },
      { $set: update },
      { upsert: true },
    );

    return update;
  }

  async recalculateAllStats() {
    const sellerIds = await this.productModel.distinct('seller');
    for (const sellerId of sellerIds) {
      if (sellerId) await this.recalculateVendorStats(sellerId);
    }
    await this.recalculateGlobalStats();
  }

  async recalculateGlobalStats(): Promise<GlobalStatsPlain> {
    const [
      totalUsers,
      totalProducts,
      totalReservations,
      totalSold,
      revenueResult,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.productModel.countDocuments(),
      this.reservationModel.countDocuments(),
      this.productModel.countDocuments({ status: ProductStatus.SOLD }),
      // Revenu = somme de `soldRevenue` figée sur chaque produit vendu, pas
      // les réservations (supprimables après la vente, cf. recalculateVendorStats).
      this.productModel.aggregate<{ total: number }>([
        { $match: { status: ProductStatus.SOLD } },
        { $group: { _id: null, total: { $sum: '$soldRevenue' } } },
      ]),
    ]);

    const update = {
      totalUsers,
      totalProducts,
      totalReservations,
      totalSold,
      totalRevenue: revenueResult[0]?.total ?? 0,
      lastRecalculatedAt: new Date(),
    };

    await this.globalStatsModel.updateOne(
      { key: GLOBAL_STATS_KEY },
      { $set: update },
      { upsert: true },
    );

    return update;
  }
}
