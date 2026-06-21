import {
  IsEnum,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductCondition,
  ProductStatus,
} from 'src/shared/enums/product.enums';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  pricenegotiable?: boolean;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  quantity?: string;

  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
