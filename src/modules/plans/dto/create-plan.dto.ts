/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { PlanType } from 'src/shared/enums/plan-type.enum';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price!: number;

  @IsNotEmpty()
  @IsEnum(PlanType)
  type!: PlanType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationInDays!: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
