/* eslint-disable @typescript-eslint/require-await */
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from '../auth/services/users/users.service';
import { ProductsService } from '../auth/services/products/products.service';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PlansService } from '../plans/plans.service';
import { Plan, PlanSchema } from '../plans/schemas/plans.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    UsersService,
    ProductsService,
    PlansService,
    JwtStrategy,
  ],
})
export class AdminModule {}
