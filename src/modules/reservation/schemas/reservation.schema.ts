/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({
    timestamps: true,
})
/**
 * Représente une réservation persistée en base (collection Mongoose).
 */
export class Reservation {

    @Prop({
        required: true,
    })
    fullname!: string;

    @Prop({
        required: true,
    })
    email!: string;

    @Prop({
        required: true,
    })
    phonenumber!: string;

    @Prop({
        type: Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    })
    product!: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: false,
        index: true,
    })
    user!: Types.ObjectId;

    @Prop({ required: true, min: 0 })
    price!: number;

    @Prop({ required: true, min: 0 })
    quantity!: string;

    @Prop({ required: false })
    address?: string;
}

/**
 * Génère le schéma Mongoose à partir de la classe `Reservation`.
 */
export const ReservationSchema = SchemaFactory.createForClass(Reservation);

