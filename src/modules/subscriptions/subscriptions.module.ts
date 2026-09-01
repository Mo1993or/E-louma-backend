import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscriptions.schema';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Plan, PlanSchema } from '../plans/schemas/plans.schema';
import { PaydunyaService } from '../paydunya/paydunya.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Plan.name,
        schema: PlanSchema,
      },
    ]),
  ],
  providers: [SubscriptionsService, PaydunyaService],
  controllers: [SubscriptionsController],
})
export class SubscriptionsModule {}
