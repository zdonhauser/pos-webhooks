import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryDB } from '../lib/db';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false, // Disable automatic body parsing to get raw body
  },
};

// Helper to get raw body from request
async function getRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the raw body for webhook verification
    const body = await getRawBody(req);

    // Get the HMAC header
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;

    // Verify webhook signature
    const shopifyWebhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!shopifyWebhookSecret) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create hash exactly like the working version
    const hash = crypto
      .createHmac('sha256', shopifyWebhookSecret)
      .update(body)
      .digest('base64');

    // Verify signature
    if (hash !== hmac) {
      console.log('Webhook signature is not valid.');
      return res.status(401).send('Webhook signature is not valid.');
    }

    // Parse transaction data
    const transaction = JSON.parse(body);

    // Log the received transaction data for debugging
    console.log('Received transaction webhook:', {
      id: transaction.id,
      order_id: transaction.order_id,
      created_at: transaction.created_at,
      processed_at: transaction.processed_at,
      amount: transaction.amount,
      kind: transaction.kind,
      status: transaction.status
    });

    // Process the transaction here
    // Insert transaction into the database
    const query = `
      INSERT INTO transactions (
        id, order_id, kind, gateway, status, message, created_at, test, "authorization",
        location_id, user_id, parent_id, processed_at, device_id, error_code, source_name,
        amount, currency, payment_id, manual_payment_gateway, admin_graphql_api_id, webhook
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        order_id = EXCLUDED.order_id,
        kind = EXCLUDED.kind,
        gateway = EXCLUDED.gateway,
        status = EXCLUDED.status,
        message = EXCLUDED.message,
        created_at = EXCLUDED.created_at,
        test = EXCLUDED.test,
        "authorization" = EXCLUDED."authorization",
        location_id = EXCLUDED.location_id,
        user_id = EXCLUDED.user_id,
        parent_id = EXCLUDED.parent_id,
        processed_at = EXCLUDED.processed_at,
        device_id = EXCLUDED.device_id,
        error_code = EXCLUDED.error_code,
        source_name = EXCLUDED.source_name,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        payment_id = EXCLUDED.payment_id,
        manual_payment_gateway = EXCLUDED.manual_payment_gateway,
        admin_graphql_api_id = EXCLUDED.admin_graphql_api_id,
        webhook = EXCLUDED.webhook
      RETURNING *;
    `;

    const values = [
      transaction.id,
      transaction.order_id,
      transaction.kind,
      transaction.gateway,
      transaction.status,
      transaction.message,
      transaction.created_at ? new Date(transaction.created_at) : null,
      transaction.test,
      transaction.authorization,
      transaction.location_id,
      transaction.user_id,
      transaction.parent_id,
      transaction.processed_at ? new Date(transaction.processed_at) : null,
      transaction.device_id,
      transaction.error_code,
      transaction.source_name,
      transaction.amount ? parseFloat(transaction.amount) : null,
      transaction.currency,
      transaction.payment_id,
      transaction.manual_payment_gateway,
      transaction.admin_graphql_api_id,
      transaction,
    ];

    // Log the values array for debugging
    console.log('Database insert values:', {
      id: values[0],
      order_id: values[1],
      created_at: values[6],
      processed_at: values[12],
      amount: values[16]
    });

    const result = await queryDB(query, values);
    console.log('Transaction inserted:', result.rows[0]);
    res.status(200).send('Webhook received successfully');

  } catch (error) {
    console.error('Error handling new transaction webhook:', error);
    res.status(500).send('Server error');
  }
}