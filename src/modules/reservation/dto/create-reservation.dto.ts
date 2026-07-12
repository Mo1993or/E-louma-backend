import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO de création d'une réservation.
 */
export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  fullname!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phonenumber!: string;

  @IsString()
  @IsNotEmpty()
  product!: string;

  @IsString()
  @IsOptional()
  user!: string;

  @IsNumber()
  @Min(0, { message: 'Le prix doit être supérieur ou égal à 0.' })
  @Type(() => Number)
  price!: number;

  @IsString()
  @IsNotEmpty({ message: 'La quantité est obligatoire.' })
  quantity!: string;

  @IsString()
  @IsNotEmpty({ message: "L'adresse est obligatoire." })
  address!: string;
}

/**
 * DTO de validation d'une réservation.
 */
export class ValidateReservationDto {
  @IsString()
  @IsNotEmpty()
  product!: string;

  /* @IsString()
  @IsNotEmpty()
  reservationId!: string; */
}
