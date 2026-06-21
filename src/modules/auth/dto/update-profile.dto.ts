import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  fullname?: string;

  @IsString()
  @IsOptional()
  phonenumber?: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' })
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @MinLength(6, { message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' })
  @IsOptional()
  newPassword?: string;
}
