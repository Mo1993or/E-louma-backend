import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategorieDocument = HydratedDocument<Categorie>;

@Schema({
  timestamps: true,
})
export class Categorie {
  @Prop({
    required: true,
    unique: true,
  })
  name: string;

  @Prop({
    required: false,
  })
  image: string;
}

export const CategorieSchema = SchemaFactory.createForClass(Categorie);
