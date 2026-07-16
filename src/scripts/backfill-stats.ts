/**
 * Script one-off à lancer une seule fois après le déploiement du schéma de
 * statistiques : renseigne le champ `seller` sur les réservations existantes,
 * puis recalcule VendorStats/GlobalStats depuis les données actuelles.
 *
 * Usage : npx ts-node -r tsconfig-paths/register src/scripts/backfill-stats.ts
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import {
  Reservation,
  ReservationDocument,
} from '../modules/reservation/schemas/reservation.schema';
import {
  Product,
  ProductDocument,
} from '../modules/products/schemas/product.schema';
import { StatsService } from '../modules/stats/stats.service';

async function backfillReservationSeller(
  reservationModel: Model<ReservationDocument>,
  productModel: Model<ProductDocument>,
) {
  const reservations = await reservationModel
    .find({ seller: { $exists: false } })
    .select('_id product')
    .lean();

  console.log(`Reservations sans seller: ${reservations.length}`);

  const productIds = [
    ...new Set(reservations.map((r) => r.product.toString())),
  ];
  const products = await productModel
    .find({ _id: { $in: productIds.map((id) => new Types.ObjectId(id)) } })
    .select('seller')
    .lean();
  const sellerByProduct = new Map(
    products.map((p) => [p._id.toString(), p.seller]),
  );

  let updated = 0;
  for (const reservation of reservations) {
    const seller = sellerByProduct.get(reservation.product.toString());
    if (!seller) continue;
    await reservationModel.updateOne(
      { _id: reservation._id },
      { $set: { seller } },
    );
    updated += 1;
  }
  console.log(`Reservations mises a jour: ${updated}`);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const reservationModel = app.get<Model<ReservationDocument>>(
      getModelToken(Reservation.name),
    );
    const productModel = app.get<Model<ProductDocument>>(
      getModelToken(Product.name),
    );
    const statsService = app.get(StatsService);

    await backfillReservationSeller(reservationModel, productModel);

    console.log('Recalcul de VendorStats/GlobalStats...');
    await statsService.recalculateAllStats();
    console.log('Termine.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
