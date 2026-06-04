import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Favoris, FavorisDocument } from '../../schemas/favoris.schema';
import { Model } from 'mongoose';

@Injectable()
export class FavorisService {
  constructor(
    @InjectModel(Favoris.name)
    private readonly favorisModel: Model<FavorisDocument>,
  ) {}

  async addFavoris(user: string, product: string) {
    await this.favorisModel.create({
      user,
      product,
    });

    return {
      message: 'Favoris ajouté',
    };
  }
}
