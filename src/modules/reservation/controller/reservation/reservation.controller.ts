/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
 
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
  /**
   * Construit le contrôleur et injecte le service de réservation.
   */
  constructor(private readonly reservationService: ReservationService) {}


  /**
   * Crée une réservation pour le produit spécifié.
   *
   * Si le champ `user` n'est pas fourni côté client, il est rempli à partir du token JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Post('add')

  async createReservation(
    @Body() createReservationDto: CreateReservationDto,
    @Request() req: any,
  ) {
    if (!createReservationDto.user) {
      createReservationDto.user = req.user.sub;
    }
    return this.reservationService.addReservation(createReservationDto);
  }


  /**
   * Récupère toutes les réservations liées aux produits du vendeur connecté.
   */
  @UseGuards(JwtAuthGuard)
  @Get('seller')

  async sellerReservations(@Request() req: any) {
    return this.reservationService.getSellerReservations(req.user.sub);
  }


  //Liste des réservations d'un utilisateur connecté
  /**
   * Récupère toutes les réservations effectuées par l'acheteur connecté.
   */
  @UseGuards(JwtAuthGuard)
  @Get('buyer')

  async buyerReservations(@Request() req: any) {
    return this.reservationService.getBuyerReservations(req.user.sub);
  }


  /**
   * Récupère les réservations associées à un produit donné.
   */
  @UseGuards(JwtAuthGuard)
  @Get('product/:productId')

  async productReservations(@Param('productId') productId: string) {
    return this.reservationService.findUsersReservation(productId);
  }


  /**
   * Valide une réservation côté vendeur.
   *
   * Le vendeur connecté est identifié via le token JWT.
   */
  @UseGuards(JwtAuthGuard)
  @Post('validate')

  async validateReservation(
    @Body() validateReservationDto: ValidateReservationDto,
    @Request() req: any,
  ) {
    return this.reservationService.validate(validateReservationDto, req.user.sub);
  }


  /**
   * Annule une réservation.
   *
   * Seuls le vendeur du produit ou l'acheteur ayant créé la réservation peuvent annuler.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':reservationId')

  async cancelReservation(
    @Param('reservationId') reservationId: string,
    @Request() req: any,
  ) {
    return this.reservationService.cancelReservation(reservationId, req.user.sub);
  }

}
