import { Module } from '@nestjs/common';
import { FavorisController } from './controller/favoris/favoris.controller';
import { Favoris, FavorisSchema } from './schemas/favoris.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { FavorisService } from './service/favoris/favoris.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Favoris.name,
        schema: FavorisSchema,
      },
    ]),
  ],
  controllers: [FavorisController],
  providers: [FavorisService],
})
export class FavorisModule {}
