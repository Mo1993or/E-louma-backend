/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CheckoutDto } from './dto/checkout.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscriptions.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { PaydunyaService } from '../paydunya/paydunya.service';
import { Plan, PlanDocument } from '../plans/schemas/plans.schema';
import { SubscriptionStatus } from 'src/shared/enums/subscription-status';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private readonly paydunyaService: PaydunyaService,
  ) {}

  async createCheckoutSession(createCheckoutDto: CheckoutDto) {
    //Find User
    const user = await this.userModel.findById(createCheckoutDto.user);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    //Get Plan
    const plan = await this.planModel.findById(createCheckoutDto.plan);
    if (!plan) throw new NotFoundException('Offre introuvable');

    // 1. Création de la facture auprès de PayDunya
    const invoice = await this.paydunyaService.createInvoice({
      title: `Abonnement ${plan.name}`,
      amount: plan.price,
      description: `Souscription à l'offre ${plan.name}`,
      customData: {
        client: user.fullname,
        offre: plan.name,
        planId: plan._id.toString(),
        userId: user._id.toString(),
      },
    });

    // 2. Enregistrement / Mise à jour de l'abonnement en statut PENDING
    await this.subscriptionModel.findOneAndUpdate(
      { user: user._id },
      {
        plan: plan._id,
        status: SubscriptionStatus.PENDING,
        lastPaydunyaToken: invoice.token,
      },
      { upsert: true, new: true },
    );

    return { redirectUrl: invoice.responseUrl, token: invoice.token };
  }

  /**
   * Traitement du Webhook IPN de PayDunya (Callback HTTP)
   */
  /* async handlePaydunyaWebhook(body: any) {
    // PayDunya envoie la structure du callback dans `data` ou à la racine
    const token = body.data?.token || body.token || body.invoice?.token;
    if (!token) {
      throw new BadRequestException('Token de transaction manquant');
    }

    // Sécurité: Toujours réinterroger l'API PayDunya GET confirm/{token}
    const payment = await this.paydunyaService.confirmPayment(token);
    console.log(payment);

    if (payment.status === 'completed') {
      const { client, offre, planId, userId } = payment.customData;
      const plan = await this.planModel.findById(planId);

      if (!plan) {
        throw new BadRequestException("Une erreur s'est produite");
      }
      console.log(plan);

      const now = new Date();
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setDate(now.getDate() + plan.durationInDays);

      await this.subscriptionModel.findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        {
          plan: new Types.ObjectId(planId),
          status: SubscriptionStatus.ACTIVE,
          lastPaydunyaToken: token,
          currentPeriodEnd: currentPeriodEnd,
        },
        { upsert: true },
      );
    }

    return { status: 'success' };
  } */

  async handlePaydunyaCheck(token: string) {
    const INTERVAL_MS = 10000;
    const MAX_DURATION_MS = 300000; // 5 minutes
    let elapsedMs = 0;

    while (elapsedMs <= MAX_DURATION_MS) {
      const payment = await this.paydunyaService.confirmPayment(token);

      if (payment.status === 'completed') {
        const { planId, userId } = payment.customData;

        // Récupération du plan en parallèle si d'autres vérifications sont nécessaires à l'avenir
        const plan = await this.planModel.findById(planId).lean();

        if (!plan) {
          throw new BadRequestException("Le plan spécifié n'existe pas");
        }

        const currentPeriodEnd = new Date();
        currentPeriodEnd.setDate(
          currentPeriodEnd.getDate() + plan.durationInDays,
        );

        await this.subscriptionModel.findOneAndUpdate(
          { user: new Types.ObjectId(userId) },
          {
            plan: new Types.ObjectId(planId),
            status: SubscriptionStatus.ACTIVE,
            lastPaydunyaToken: token,
            currentPeriodEnd: currentPeriodEnd,
          },
          { upsert: true, new: true },
        );

        return { status: 'success' };
      }

      if (payment.status === 'cancelled') {
        await this.subscriptionModel.findOneAndUpdate(
          { user: new Types.ObjectId(payment.customData.userId) }, // Recherche sécurisée par userId
          { status: SubscriptionStatus.CANCELED },
          { upsert: true },
        );
        return { status: 'cancelled' };
      }

      // Attendre avant la prochaine tentative
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
      elapsedMs += INTERVAL_MS;
    }

    return { status: 'timeout' };
  }
}
