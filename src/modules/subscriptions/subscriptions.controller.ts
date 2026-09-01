import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(@Body() createCheckoutDto: CheckoutDto) {
    return this.subscriptionsService.createCheckoutSession(createCheckoutDto);
  }

  //Verification de l'état du paiement
  @UseGuards(JwtAuthGuard)
  @Post('payment-status')
  async handleWebhook(@Body('token') token: string) {
    return this.subscriptionsService.handlePaydunyaCheck(token);
  }
}
