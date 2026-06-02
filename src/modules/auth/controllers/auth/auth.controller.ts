/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../../services/auth/auth.service';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ForgotPasswordDto } from '../../dto/forgot-password.dto';
import { ResetPasswordDto } from '../../dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Request() req) {
    return req.user;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.generateAndSendCode(
      forgotPasswordDto.email,
      'PASSWORD_RESET',
    );
    return {
      success: true,
      message:
        'Si cet email existe, un code de réinitialisation vous a été envoyé.',
    };
  }

  /**
   * 2. Validation du code et changement de mot de passe
   * Consomme le code et met à jour la base de données
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * 3. Validation de compte (Inscription)
   * Reçoit l'email et le code d'activation envoyé lors du register
   */
  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    if (!email || !code) {
      throw new BadRequestException(
        "L'email et le code de validation sont obligatoires.",
      );
    }
    return await this.authService.verifyRegisterCode(email, code);
  }
}
