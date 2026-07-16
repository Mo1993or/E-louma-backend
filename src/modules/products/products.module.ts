/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsController } from './controllers/products/products.controller';
import { ProductsService } from './services/products/products.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { StatsModule } from '../stats/stats.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Product.name,
                schema: ProductSchema,
            },
            {
                name: User.name,
                schema: UserSchema,
            },
        ]),
        CloudinaryModule,
        StatsModule,
    ],
    controllers: [ProductsController],
    providers: [ProductsService]
})
export class ProductsModule { }
