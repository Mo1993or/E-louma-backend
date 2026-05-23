import {
  IsEnum,
  IsArray,
  IsNotEmpty,
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

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire.' })
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @Min(0, { message: 'Le prix doit être supérieur ou égal à 0.' })
  @Type(() => Number) // Convertit la chaîne reçue du formulaire (multipart) en Number
  price: number;

  @IsNotEmpty()
  pricenegotiable: boolean;

  @IsString()
  @IsNotEmpty({ message: 'La catégorie est obligatoire.' })
  category: string;

  @IsString()
  @IsOptional()
  brand: string;

  @IsString()
  @IsNotEmpty({ message: 'La quantité est obligatoire.' })
  quantity: string;

  @IsEnum(ProductCondition, {
    message: 'La condition doit être : neuf, excellent, bon état ou user.',
  })
  condition: ProductCondition;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // Géré automatiquement par votre contrôleur après l'upload Cloudinary
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images: string[];
}
