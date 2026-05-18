import { Body, Controller, Get, Post } from '@nestjs/common';
import { CategoriesService } from '../../services/categories/categories.service';
import { CategorieDto } from '../../dto/categorie.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoriesService) {}

  @Post('store')
  store(@Body() dto: CategorieDto) {
    return this.categoryService.addCategory(dto);
  }

  @Get('')
  index() {
    return this.categoryService.getAllCategories();
  }
}
