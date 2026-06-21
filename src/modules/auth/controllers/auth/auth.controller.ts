/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthService } from '../../services/auth/auth.service';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { UpdateProfileDto } from '../../dto/update-profile.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { ForgotPasswordDto } from '../../dto/forgot-password.dto';
import { ResetPasswordDto } from '../../dto/reset-password.dto';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
  async profile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    let avatarUrl: string | undefined;
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file);
      if (result && 'secure_url' in result) {
        avatarUrl = result.secure_url;
      }
    }
    return this.authService.updateProfile(req.user.sub, dto, avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body('email') email: string, @Request() req: any) {
    await this.authService.sendVerificationCode(req.user.sub, email);
    return { success: true, message: 'Un code de validation vous a ete envoye.' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.generateAndSendCode(forgotPasswordDto.email, 'PASSWORD_RESET');
    return {
      success: true,
      message: 'Si cet email existe, un code de reinitialisation vous a ete envoye.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    if (!email || !code) {
      throw new BadRequestException("L'email et le code de validation sont obligatoires.");
    }
    return this.authService.verifyRegisterCode(email, code);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body('email') email: string, @Body('code') code: string) {
    if (!email || !code) {
      throw new BadRequestException("L'email et le code de validation sont obligatoires.");
    }
    return this.authService.verifyCode(email, code);
  }
}
