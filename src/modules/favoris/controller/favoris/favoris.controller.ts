/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { FavorisService } from '../../service/favoris/favoris.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('favoris')
export class FavorisController {
  constructor(private readonly favorisService: FavorisService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addFavoris(@Body('product') product: string, @Request() req: any) {
    return this.favorisService.addFavoris(req.user.sub, product);
  }
}
