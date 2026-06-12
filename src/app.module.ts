import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './core/config/database.config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { FavorisModule } from './modules/favoris/favoris.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // ENV
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongoUri'),
      }),
    }),

    AuthModule,

    ProductsModule,

    CategoriesModule,

    ReservationModule,

    FavorisModule,

    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
