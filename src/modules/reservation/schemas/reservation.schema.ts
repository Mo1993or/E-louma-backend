/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({
    timestamps: true,
})
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
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
