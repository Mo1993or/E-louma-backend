/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreateProductDto } from '../../dto/create-product.dto';
import { UpdateProductDto } from '../../dto/update-product.dto';
import { ProductStatus } from 'src/shared/enums/product.enums';
import { User, UserDocument } from 'src/modules/auth/schemas/user.schema';
import { StatsService } from 'src/modules/stats/stats.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly statsService: StatsService,
  ) {}

  async addProduct(
    data: CreateProductDto,
    imagesUrls: string[],
    user: Types.ObjectId,
  ) {
    const sellerInfo = await this.userModel.findById(user).select('phonenumber email');
    const category = new Types.ObjectId(data.category);

    const product = await this.productModel.create({
      ...data,
      images: imagesUrls,
      seller: user,
      category,
    });

    await this.statsService.onProductCreated(user, category);

    return { message: 'Produit cree avec succes', product, sellerInfo };
  }

  async getProductsByCategoryId(categoryId: string): Promise<ProductDocument[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException("Le format de l'identifiant de categorie est invalide.");
    }
    const products = await this.productModel
      .find({ category: new Types.ObjectId(categoryId), status: ProductStatus.AVAILABLE })
      .populate('category')
      .populate('seller', '_id phonenumber')
      .exec();
    if (!products || products.length === 0) {
      throw new NotFoundException('Aucun produit trouve pour cette categorie.');
    }
    return products;
  }

  async getAllProduct(cursor?: string, limit = 20, user?: string) {
  const filter: Record<string, any> = {};

  // 1. Gestion du curseur pour la pagination
  if (cursor && Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new Types.ObjectId(cursor) };
  }

  // 2. Exclusion des produits ajoutés par l'utilisateur connecté
  if (user && Types.ObjectId.isValid(user)) {
    filter.seller = { $ne: new Types.ObjectId(user) }; // Assurez-vous que le champ s'appelle bien 'seller' dans votre schéma
  }

  // 3. Récupération des produits avec le filtre mis à jour
  const products = await this.productModel
    .find(filter)
    .populate('category')
    .populate('seller', '_id phonenumber')
    .sort({ _id: -1 })
    .limit(limit + 1)
    .exec();

  const hasMore = products.length > limit;
  if (hasMore) products.pop();

  const nextCursor = hasMore ? products[products.length - 1]._id.toString() : null;

  return {
    products,
    nextCursor,
    hasMore,
  };
}

  async getAllProductsOwer(userId: string): Promise<ProductDocument[]> {
    return this.productModel
      .find({ seller: new Types.ObjectId(userId) })
      .populate('category')
      .populate('seller', '_id phonenumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findProductById(productId: string) {
    const product = await this.productModel
      .findOne({ _id: new Types.ObjectId(productId) })
      .populate('category')
      .populate('seller', '_id phonenumber')
      .exec();
    if (!product) throw new NotFoundException('Produit introuvable');
    await this.productModel.updateOne({ _id: product._id }, { $inc: { views: 1 } });
    // `seller` est peuplé ci-dessus (document User), d'où l'accès via `_id`.
    const populatedSeller = product.seller as unknown as
      | { _id: Types.ObjectId }
      | undefined;
    if (populatedSeller?._id) {
      await this.statsService.onProductViewed(populatedSeller._id);
    }
    return product;
  }

  async searchProducts(query: string, categoryId?: string): Promise<ProductDocument[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Le terme de recherche est requis.');
    }
    const filter: Record<string, any> = {
      status: ProductStatus.AVAILABLE,
      $or: [
        { title: { $regex: query.trim(), $options: 'i' } },
        { description: { $regex: query.trim(), $options: 'i' } },
        { brand: { $regex: query.trim(), $options: 'i' } },
      ],
    };
    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.category = new Types.ObjectId(categoryId);
    }
    return this.productModel
      .find(filter)
      .populate('category')
      .populate('seller', '_id phonenumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateProduct(
    productId: string,
    userId: string,
    data: UpdateProductDto,
    newImages?: string[],
  ) {
    const product = await this.productModel.findById(new Types.ObjectId(productId));
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.seller?.toString() !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce produit');
    }
    const updateData: Record<string, any> = { ...data };
    const newCategoryId = data.category
      ? new Types.ObjectId(data.category)
      : undefined;
    if (newCategoryId) {
      updateData.category = newCategoryId;
    }
    if (newImages && newImages.length > 0) {
      updateData.images = newImages;
    }
    const updated = await this.productModel
      .findByIdAndUpdate(
        new Types.ObjectId(productId),
        { $set: updateData },
        { new: true },
      )
      .populate('category')
      .populate('seller', '_id phonenumber');

    const sellerId = product.seller;
    if (data.status && data.status !== product.status) {
      await this.statsService.onProductStatusChanged(
        sellerId,
        product.status,
        data.status,
      );
    }
    if (newCategoryId && newCategoryId.toString() !== product.category.toString()) {
      await this.statsService.onProductCategoryChanged(
        sellerId,
        product.category,
        newCategoryId,
      );
    }

    return { message: 'Produit mis a jour', product: updated };
  }

  async deleteProduct(productId: string, userId: string) {
    const product = await this.productModel.findById(new Types.ObjectId(productId));
    if (!product) throw new NotFoundException('Produit introuvable');
    if (product.seller?.toString() !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce produit');
    }
    await this.productModel.findByIdAndDelete(new Types.ObjectId(productId));
    await this.statsService.onProductDeleted(
      product.seller,
      product.category,
      product.status,
      product.soldRevenue,
    );
    return { message: 'Produit supprime avec succes' };
  } 
}
