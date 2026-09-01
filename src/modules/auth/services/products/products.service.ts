import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
} from 'src/modules/products/schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  /**
   * Récupère tous les products
   */
  async findAll(): Promise<ProductDocument[]> {
    return this.productModel.find().exec();
  }

  /**
   * Trouve un produit par son ID
   */
  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({ _id: new Types.ObjectId(id) })
      .exec();
    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }
    return product;
  }

  /**
   * Supprime un produit
   */
  async remove(id: string): Promise<{ message: string }> {
    const product = await this.productModel
      .findOne({ _id: new Types.ObjectId(id) })
      .exec();

    if (!product) {
      throw new NotFoundException(
        `Le produit avec l'ID '${id}' est introuvable.`,
      );
    }

    if (product.reservations > 0) {
      throw new ConflictException(
        'Impossible de supprimer ce produit car il y a des réservations en cours.',
      );
    }

    await product.deleteOne();

    return { message: 'Produit supprimé avec succès.' };
  }
}
