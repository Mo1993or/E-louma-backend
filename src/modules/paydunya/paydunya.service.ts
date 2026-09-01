/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface CreateInvoiceParams {
  title: string;
  amount: number;
  description: string;
  customData: Record<string, any>;
}

@Injectable()
export class PaydunyaService {
  private readonly logger = new Logger(PaydunyaService.name);
  private readonly httpClient: AxiosInstance;

  constructor() {
    const isLive = process.env.PAYDUNYA_MODE === 'live';
    const baseUrl = isLive
      ? 'https://app.paydunya.com/api/v1'
      : 'https://app.paydunya.com/sandbox-api/v1';

    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PUBLIC-KEY': process.env.PAYDUNYA_PUBLIC_KEY,
        'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
      },
    });
  }

  /**
   * Crée une facture de Checkout via l'API HTTP/JSON
   * Endpoint: POST /checkout-invoice/create
   */
  async createInvoice(params: CreateInvoiceParams) {
    const payload = {
      invoice: {
        total_amount: params.amount,
        description: params.description,
      },
      store: {
        name: 'E-Louma',
        website_url: process.env.APP_FRONTEND_URL,
      },
      custom_data: params.customData,
      actions: {
        cancel_url: `${process.env.APP_FRONTEND_URL}/pricing`,
        return_url: `${process.env.APP_FRONTEND_URL}/dashboard?status=success`,
        callback_url: `${process.env.APP_BACKEND_URL}/subscriptions/paydunya-webhook`,
      },
    };

    try {
      const response = await this.httpClient.post(
        '/checkout-invoice/create',
        payload,
      );
      const data = response.data;

      if (data.response_code === '00') {
        return {
          token: data.token,
          responseUrl: data.response_text, // URL de redirection vers le portail PayDunya
        };
      }

      this.logger.error(
        `Erreur création facture PayDunya: ${JSON.stringify(data)}`,
      );
      throw new Error(
        data.response_text || 'Échec de la création de la facture PayDunya',
      );
    } catch (error) {
      this.logger.error(`Erreur HTTP PayDunya: ${error?.message}`);
      throw new InternalServerErrorException(
        `PayDunya API Error: ${error?.message}`,
      );
    }
  }

  /**
   * Vérifie le statut d'une facture via son Token
   * Endpoint: GET /checkout-invoice/confirm/{token}
   */
  async confirmPayment(token: string) {
    try {
      const response = await this.httpClient.get(
        `/checkout-invoice/confirm/${token}`,
      );
      const data = response.data;

      return {
        responseCode: data.response_code,
        status: data.status, // 'completed', 'pending', 'cancelled'
        invoice: data.invoice,
        customData: data.custom_data,
        customer: data.customer,
        receiptUrl: data.receipt_url,
      };
    } catch (error) {
      this.logger.error(
        `Erreur confirmation PayDunya (${token}): ${error.message}`,
      );
      throw new InternalServerErrorException(
        `PayDunya Confirmation Error: ${error.message}`,
      );
    }
  }
}
