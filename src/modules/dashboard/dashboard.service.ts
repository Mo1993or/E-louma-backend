import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Model, Types } from 'mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../reservation/schemas/reservation.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Categorie,
  CategorieDocument,
} from '../categories/schemas/categorie.schema';
import { StatsService } from '../stats/stats.service';

/**
 * Le dashboard ne fait plus aucun calcul lourd à la lecture : les totaux, la
 * tendance mensuelle et la répartition par catégorie viennent de VendorStats
 * (maintenu à jour en temps réel par StatsService). Seules deux requêtes
 * indexées et bornées (réservations récentes, top produits) restent ici.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Categorie.name)
    private readonly categorieModel: Model<CategorieDocument>,
    private readonly statsService: StatsService,
  ) {}

  async getDashboard(userId: string) {
    const seller = new Types.ObjectId(userId);

    const [
      vendorStats,
      recentReservations,
      topProductsByViews,
      topProductsByReservations,
      sellerProfile,
    ] = await Promise.all([
      this.statsService.getVendorStats(seller),
      this.reservationModel
        .find({ seller })
        .populate('product', 'title price status')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      this.productModel
        .find({ seller })
        .select(
          'title price images status views reservations favoritesCount category',
        )
        .populate('category', 'name')
        .sort({ views: -1 })
        .limit(5)
        .lean(),
      this.productModel
        .find({ seller })
        .select(
          'title price images status views reservations favoritesCount category',
        )
        .populate('category', 'name')
        .sort({ reservations: -1 })
        .limit(5)
        .lean(),
      this.userModel.findById(seller).select('-password').lean(),
    ]);

    return {
      seller: sellerProfile,
      stats: {
        totalProducts: vendorStats.totalProducts,
        totalAvailable: vendorStats.totalAvailable,
        totalReserved: vendorStats.totalReserved,
        totalSold: vendorStats.totalSold,
        totalReservations: vendorStats.totalReservations,
        totalRevenue: vendorStats.totalRevenue,
        totalViews: vendorStats.totalViews,
        totalFavorites: vendorStats.totalFavorites,
      },
      recentReservations,
      topProductsByViews,
      topProductsByReservations,
      monthlyTrend: this.formatMonthlyTrend(vendorStats.monthlyTrend),
      categoryBreakdown: await this.formatCategoryBreakdown(
        vendorStats.categoryBreakdown,
      ),
    };
  }

  async getGlobalStats() {
    return this.statsService.getGlobalStats();
  }

  /** Recalcule à la demande les stats du vendeur connecté (auto-réparation en cas de dérive). */
  async recalculateMyStats(userId: string) {
    return this.statsService.recalculateVendorStats(userId);
  }

  private formatMonthlyTrend(
    monthlyTrend:
      | Record<string, { reservations: number; revenue: number }>
      | undefined,
  ) {
    const months: {
      year: number;
      month: number;
      label: string;
      reservations: number;
      revenue: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const entry = monthlyTrend?.[key];

      months.push({
        year,
        month,
        label: d.toLocaleString('fr-FR', { month: 'short', year: 'numeric' }),
        reservations: entry?.reservations ?? 0,
        revenue: entry?.revenue ?? 0,
      });
    }

    return months;
  }

  private async formatCategoryBreakdown(
    categoryBreakdown:
      | Record<string, { count: number; revenue: number }>
      | undefined,
  ) {
    const categoryIds = Object.keys(categoryBreakdown ?? {});
    if (categoryIds.length === 0) return [];

    const categories = await this.categorieModel
      .find({ _id: { $in: categoryIds.map((id) => new Types.ObjectId(id)) } })
      .select('name')
      .lean();
    const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

    return categoryIds.map((categoryId) => ({
      categoryId,
      name: nameById.get(categoryId) ?? 'Sans categorie',
      count: categoryBreakdown![categoryId].count,
      revenue: categoryBreakdown![categoryId].revenue,
    }));
  }
}
