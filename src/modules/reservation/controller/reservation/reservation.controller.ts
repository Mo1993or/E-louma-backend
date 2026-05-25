import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReservationService } from '../../services/reservation/reservation.service';
import { CreateReservationDto } from '../../dto/create-reservation.dto';
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
}
