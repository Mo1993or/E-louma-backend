/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Categorie, CategorieDocument } from '../../schemas/categorie.schema';
import { CategorieDto } from '../../dto/categorie.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Categorie.name)
    private categorieModel: Model<CategorieDocument>,
  ) {}

  async addCategory(
    imageUrl: string,
    data: CategorieDto
  ) {
    const existingCategory = await this.categorieModel.findOne({
      name: data.name      
    });
    if (existingCategory) {
      throw new BadRequestException('Category already exists');
    }

    const category = await this.categorieModel.create({
      name: data.name,
      image: imageUrl
    });
    return {
      message: 'category created',
      category,
    };
  }

  async getAllCategories() {
    return await this.categorieModel.find();
  }
}
