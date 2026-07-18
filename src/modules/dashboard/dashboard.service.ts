import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { StatsService } from '../stats/stats.service';

/**
 * Le dashboard ne fait plus aucun calcul lourd à la lecture : les totaux et la
 * tendance mensuelle viennent de VendorStats (maintenu à jour en temps réel
 * par StatsService).
 */
@Injectable()
export class DashboardService {
  constructor(private readonly statsService: StatsService) {}

  async getDashboard(userId: string) {
    const seller = new Types.ObjectId(userId);
    const vendorStats = await this.statsService.getVendorStats(seller);

    return {
      totalRevenue: vendorStats.totalRevenue,
      totalSold: vendorStats.totalSold,
      totalReservations: vendorStats.totalReservations,
      totalProducts: vendorStats.totalProducts,
      monthlyTrend: this.formatMonthlyTrend(vendorStats.monthlyTrend),
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
}
