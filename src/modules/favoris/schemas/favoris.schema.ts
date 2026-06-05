/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FavorisDocument = HydratedDocument<Favoris>;

@Schema({
    timestamps: true,
})
export class Favoris {
    @Prop({
        required: true,
    })
    user!: string;

    @Prop({
        required: true,
    })
    product!: string;    
}

export const FavorisSchema = SchemaFactory.createForClass(Favoris);
