/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Post('toggle')
  async toggleFavoris(@Body('product') product: string, @Request() req: any) {
    return this.favorisService.toggleFavoris(req.user.sub, product);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':productId')
  async removeFavoris(
    @Param('productId') productId: string,
    @Request() req: any,
  ) {
    return this.favorisService.removeFavoris(req.user.sub, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('')
  async getFavoris(@Request() req: any) {
    return this.favorisService.getFavoris(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check/:productId')
  async isFavorite(
    @Param('productId') productId: string,
    @Request() req: any,
  ) {
    return this.favorisService.isFavorite(req.user.sub, productId);
  }
}
