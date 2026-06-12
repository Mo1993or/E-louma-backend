/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
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
  @Get('users-reservations/:product')
  async usersReservation(@Param('product') productId: string) {
    return this.reservationService.findUsersReservation(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  async validateReservation(
    @Body() validateReservationDto: ValidateReservationDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.reservationService.validate(validateReservationDto, userId);
  }
}
