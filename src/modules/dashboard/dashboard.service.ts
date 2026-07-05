import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Model, Types } from 'mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../reservation/schemas/reservation.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { ProductStatus } from 'src/shared/enums/product.enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getDashboard(userId: string) {
    const sellerObjectId = new Types.ObjectId(userId);

    // 1. Tous les produits du vendeur
    const products = await this.productModel
      .find({ seller: sellerObjectId })
      .populate('category', 'name')
      .lean();

    const productIds = products.map((p) => p._id);

    // 2. Stats produits
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

    // 3. Toutes les reservations sur les produits du vendeur
    const reservations = await this.reservationModel
      .find({ product: { $in: productIds } })
      .populate('product', 'title price images status')
      .sort({ createdAt: -1 })
      .lean();

    const totalReservations = reservations.length;

    // 4. Revenu total (produits vendus)
    const soldProductIds = new Set(
      products
        .filter((p) => p.status === ProductStatus.SOLD)
        .map((p) => p._id.toString()),
    );

    const totalRevenue = reservations
      .filter((r) => {
        const prod = r.product as any;
        const productId = prod?._id?.toString() ?? prod?.toString();
        return soldProductIds.has(productId ?? '');
      })
      .reduce((acc, r) => acc + (r.price ?? 0), 0);

    // 5. Reservations recentes (10 dernieres)
    const recentReservations = reservations.slice(0, 10);

    // 6. Top 5 produits par vues
    const topProductsByViews = [...products]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 5)
      .map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        images: p.images,
        status: p.status,
        views: p.views,
        reservations: p.reservations,
        favoritesCount: p.favoritesCount,
        category: p.category,
      }));

    // 7. Top 5 produits par reservations
    const topProductsByReservations = [...products]
      .sort((a, b) => (b.reservations ?? 0) - (a.reservations ?? 0))
      .slice(0, 5)
      .map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        images: p.images,
        status: p.status,
        views: p.views,
        reservations: p.reservations,
        favoritesCount: p.favoritesCount,
        category: p.category,
      }));

    // 8. Tendance mensuelle (12 derniers mois)
    const monthlyTrend = await this.getMonthlyTrend(productIds);

    // 9. Repartition par categorie
    const categoryBreakdown = this.getCategoryBreakdown(products);

    // 10. Profil du vendeur
    const seller = await this.userModel
      .findById(sellerObjectId)
      .select('-password')
      .lean();

    return {
      seller,
      stats: {
        totalProducts,
        totalAvailable,
        totalReserved,
        totalSold,
        totalReservations,
        totalRevenue,
        totalViews,
        totalFavorites,
      },
      recentReservations,
      topProductsByViews,
      topProductsByReservations,
      monthlyTrend,
      categoryBreakdown,
    };
  }

  private async getMonthlyTrend(productIds: Types.ObjectId[]) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const result = await this.reservationModel.aggregate([
      {
        $match: {
          product: { $in: productIds },
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          reservations: { $sum: 1 },
          revenue: { $sum: '$price' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          reservations: 1,
          revenue: 1,
        },
      },
    ]);

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
      const found = result.find((r) => r.year === year && r.month === month);

      months.push({
        year,
        month,
        label: d.toLocaleString('fr-FR', { month: 'short', year: 'numeric' }),
        reservations: found?.reservations ?? 0,
        revenue: found?.revenue ?? 0,
      });
    }

    return months;
  }

  private getCategoryBreakdown(products: any[]) {
    const map = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();

    for (const p of products) {
      const cat = p.category;
      if (!cat) continue;
      const catId = cat._id?.toString() ?? 'unknown';
      const catName = cat.name ?? 'Sans categorie';

      if (!map.has(catId)) {
        map.set(catId, { name: catName, count: 0, revenue: 0 });
      }
      const entry = map.get(catId)!;
      entry.count += 1;
      if (p.status === ProductStatus.SOLD) {
        entry.revenue += p.price ?? 0;
      }
    }

    return Array.from(map.entries()).map(([id, data]) => ({
      categoryId: id,
      ...data,
    }));
  }

  async getGlobalStats() {
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
      this.reservationModel.aggregate([
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
    ]);

    return {
      totalUsers,
      totalProducts,
      totalReservations,
      totalSold,
      totalRevenue: revenueResult[0]?.total ?? 0,
    };
  }
}
