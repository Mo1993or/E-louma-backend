/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Favoris, FavorisDocument } from '../../schemas/favoris.schema';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
} from 'src/modules/products/schemas/product.schema';
import { User, UserDocument } from 'src/modules/auth/schemas/user.schema';
import { NotificationService } from 'src/modules/notification/notification.service';

@Injectable()
export class FavorisService {
  constructor(
    @InjectModel(Favoris.name)
    private readonly favorisModel: Model<FavorisDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async addFavoris(user: string, product: string) {
    const existing = await this.favorisModel.findOne({ user, product });
    if (existing) {
      return { message: 'Deja dans vos favoris' };
    }
    await this.favorisModel.create({ user, product });
    await this.productModel.updateOne(
      { _id: new Types.ObjectId(product) },
      { $inc: { favoritesCount: 1 } },
    );

    const productDoc = await this.productModel.findById(product).lean();
    if (productDoc?.seller) {
      const seller = await this.userModel.findById(productDoc.seller).lean();
      if (seller?.fcmToken) {
        this.notificationService.sendToDevice(
          seller.fcmToken,
          'Nouveau favori',
          `Quelqu'un a ajoute "${productDoc.title}" a ses favoris`,
          { type: 'NEW_FAVORITE', productId: product },
        );
      }
    }

    return { message: 'Favoris ajoute' };
  }

  async toggleFavoris(user: string, product: string) {
    const existing = await this.favorisModel.findOne({ user, product });
    if (existing) {
      await this.favorisModel.deleteOne({ _id: existing._id });
      await this.productModel.updateOne(
        { _id: new Types.ObjectId(product) },
        { $inc: { favoritesCount: -1 } },
      );
      return { message: 'Retire des favoris', isFavorite: false };
    }
    await this.favorisModel.create({ user, product });
    await this.productModel.updateOne(
      { _id: new Types.ObjectId(product) },
      { $inc: { favoritesCount: 1 } },
    );
    return { message: 'Ajoute aux favoris', isFavorite: true };
  }

  async removeFavoris(user: string, product: string) {
    const result = await this.favorisModel.deleteOne({ user, product });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Ce favori est introuvable');
    }
    await this.productModel.updateOne(
      { _id: new Types.ObjectId(product) },
      { $inc: { favoritesCount: -1 } },
    );
    return { message: 'Retire des favoris' };
  }

  async getFavoris(user: string) {
    return this.favorisModel
      .find({ user })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async isFavorite(user: string, product: string) {
    const fav = await this.favorisModel.findOne({ user, product });
    return { isFavorite: !!fav };
  }
}
