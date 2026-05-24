import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ProductCondition,
  ProductStatus,
} from 'src/shared/enums/product.enums';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  timestamps: true,
})
export class Product {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true })
  pricenegotiable!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'Categorie',
    required: true,
    index: true,
  }) // Indexé pour accélérer les recherches par catégorie
  category!: Types.ObjectId;

  @Prop({ required: false })
  brand?: string;

  @Prop({ required: true })
  quantity!: string;

  @Prop({
    type: String,
    enum: Object.values(ProductCondition),
    required: true,
  })
  condition?: ProductCondition;

  @Prop({ type: [String], required: true }) // Tableau d'URLs d'images
  images!: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) // Relation avec le schéma User
  seller?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ProductStatus),
    default: ProductStatus.AVAILABLE,
  })
  status!: ProductStatus;

  @Prop({ type: Number, default: 0, min: 0 })
  favoritesCount!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  views!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
