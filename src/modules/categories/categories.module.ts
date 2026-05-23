import { Module } from '@nestjs/common';
import { CategoriesService } from './services/categories/categories.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Categorie, CategorieSchema } from './schemas/categorie.schema';
import { CategoriesController } from './controllers/categories/categories.controller';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Categorie.name,
        schema: CategorieSchema,
      },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService, CloudinaryService],
})
export class CategoriesModule {}
