/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { ReservationService } from '../../services/reservation/reservation.service';
import {
  CreateReservationDto,
  ValidateReservationDto,
} from '../../dto/create-reservation.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post('add')
  async createReservation(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationService.addReservation(createReservationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller')
  async sellerReservations(@Request() req: any) {
    return this.reservationService.getSellerReservations(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('buyer')
  async buyerReservations(@Request() req: any) {
    return this.reservationService.getBuyerReservations(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('product/:productId')
  async productReservations(@Param('productId') productId: string) {
    return this.reservationService.findUsersReservation(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  async validateReservation(
    @Body() validateReservationDto: ValidateReservationDto,
    @Request() req: any,
  ) {
    return this.reservationService.validate(validateReservationDto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':reservationId')
  async cancelReservation(
    @Param('reservationId') reservationId: string,
    @Request() req: any,
  ) {
    return this.reservationService.cancelReservation(reservationId, req.user.sub);
  }
}
