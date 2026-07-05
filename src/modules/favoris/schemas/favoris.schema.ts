import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FavorisDocument = HydratedDocument<Favoris>;

@Schema({
  timestamps: true,
})
export class Favoris {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  product!: Types.ObjectId;
}

export const FavorisSchema = SchemaFactory.createForClass(Favoris);

FavorisSchema.index({ user: 1, product: 1 }, { unique: true });
