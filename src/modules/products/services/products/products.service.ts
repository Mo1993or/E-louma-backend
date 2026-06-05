/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from '../../schemas/product.schema';
import { CreateProductDto } from '../../dto/create-product.dto';
import { ProductStatus } from 'src/shared/enums/product.enums';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) { }

  /**
   * Crée un nouveau produit lié à l'utilisateur connecté
   */
  async addProduct(
    data: CreateProductDto,
    imagesUrls: string[],
    user: Types.ObjectId,
  ) {
    const product = await this.productModel.create({
      ...data,
      images: imagesUrls,
      seller: user,
      category: new Types.ObjectId(data.category),
    });

    return {
      message: 'product created',
      product,
    };
  }

  /**
   * Récupère tous les produits appartenant à un identifiant de catégorie
   */
  async getProductsByCategoryId(
    categoryId: string,
  ): Promise<ProductDocument[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException(
        "Le format de l'identifiant de catégorie est invalide.",
      );
    }

    // 2. Recherche avec conversion en ObjectId et inclusion des détails
    const products = await this.productModel
      .find({ category: new Types.ObjectId(categoryId) })
      .populate('category') // Fonctionne si 'category' est un ObjectId lié à un autre schéma dans votre product.schema.ts
      .populate('seller', '-password') // Masque le mot de passe du vendeur pour la sécurité
      .exec();

    // 3. Gestion du cas où la liste est vide
    if (!products || products.length === 0) {
      throw new NotFoundException(`Aucun produit trouvé pour cette catégorie.`);
    }

    return products;
  }

  async getAllProduct(): Promise<ProductDocument[]> {
    return await this.productModel.find({ status: ProductStatus.AVAILABLE })
      .populate('category')
      .exec();
  }
  async getAllProductsOwer(userId: string): Promise<ProductDocument[]> {
    return await this.productModel.find({ status: ProductStatus.AVAILABLE, seller: new Types.ObjectId(userId) }).populate('category')
      .exec();
  }

  async findProductById(productId: string) {
    const product = await this.productModel.findOne({ _id: new Types.ObjectId(productId) }).populate('category')
      .exec();
    if (product) {
      await this.productModel.updateOne(
      {
        _id: product._id,
      },
      { $inc: { views: 1 } },
    );
    return product
    }
    throw new NotFoundException("Produit introuvable")
  }

}
