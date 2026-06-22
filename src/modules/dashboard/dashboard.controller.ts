/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('')
  async dashboard(@Request() req: any) {
    return this.dashboardService.getDashboard(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('global')
  async globalStats() {
    return this.dashboardService.getGlobalStats();
  }
}
