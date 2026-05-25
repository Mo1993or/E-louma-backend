import { IsEmpty, IsNotEmpty } from 'class-validator';

export class CategorieDto {
  @IsNotEmpty()
  name!: string;

  @IsEmpty()
  image?: string;
}
