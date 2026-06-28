/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CategoriesService } from '../../services/categories/categories.service';
import { CategorieDto } from '../../dto/categorie.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoryService: CategoriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('store')
  @UseInterceptors(FileInterceptor('image'))
  async store(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CategorieDto) {
      let imageUrl = '';
      if (file) {
      const result = await this.cloudinaryService.uploadCategoryImage(file);
      if (result && 'secure_url' in result) {
        imageUrl = result.secure_url;
      }
    }
    return this.categoryService.addCategory(imageUrl, dto);
  }


  @Get('')
  index() {
    return this.categoryService.getAllCategories();
  }
}
