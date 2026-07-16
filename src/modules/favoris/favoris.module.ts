import { Module } from '@nestjs/common';
import { FavorisController } from './controller/favoris/favoris.controller';
import { Favoris, FavorisSchema } from './schemas/favoris.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { FavorisService } from './service/favoris/favoris.service';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Favoris.name, schema: FavorisSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
    StatsModule,
  ],
  controllers: [FavorisController],
  providers: [FavorisService],
})
export class FavorisModule {}
