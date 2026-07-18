import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [StatsModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
