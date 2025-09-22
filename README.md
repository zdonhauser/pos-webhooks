# POS Webhooks - Shopify Transaction Webhook Handler

A Vercel serverless function to receive and process Shopify transaction webhooks, storing them in a PostgreSQL database.

## Features

- HMAC SHA256 webhook signature verification
- Automatic retry and conflict resolution (upsert)
- Stores complete webhook payload for audit trail
- Optimized for Vercel's free tier
- TypeScript for type safety

## Setup

### 1. Database Setup

Run the SQL migration to create the transactions table:

```bash
psql -U your_username -d your_database -f schema.sql
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `SHOPIFY_WEBHOOK_SECRET`: Your Shopify webhook secret

### 3. Install Dependencies

```bash
npm install
```

### 4. Local Development

```bash
npm run dev
```

The webhook will be available at: `http://localhost:3000/api/webhook-transaction`

## Deployment to Vercel

### Option 1: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard or CLI:
```bash
vercel env add DATABASE_URL
vercel env add SHOPIFY_WEBHOOK_SECRET
```

4. Deploy to production:
```bash
vercel --prod
```

### Option 2: Using GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

## Webhook URL

After deployment, your webhook URL will be:
```
https://your-app.vercel.app/api/webhook-transaction
```

Or with the rewrite rule:
```
https://your-app.vercel.app/webhook/new-transaction
```

## Shopify Configuration

1. Go to your Shopify admin panel
2. Navigate to Settings → Notifications
3. Add webhook for "Order transactions"
4. Set URL to your deployed webhook endpoint
5. Note the webhook secret for your environment variables

## Testing

### Using curl:

```bash
# Generate test signature
BODY='{"id":12345,"order_id":67890,"kind":"sale","amount":"100.00"}'
SECRET='your_shopify_webhook_secret'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Send test webhook
curl -X POST http://localhost:3000/api/webhook-transaction \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $SIGNATURE" \
  -d "$BODY"
```

## Database Schema

The `transactions` table includes:

- **id**: Transaction ID from Shopify (Primary Key)
- **order_id**: Associated order ID
- **kind**: Transaction type (authorization, capture, sale, void, refund, change)
- **gateway**: Payment gateway used
- **status**: Transaction status
- **amount**: Transaction amount
- **currency**: Currency code
- **webhook**: Full webhook payload (JSONB)
- Plus additional fields for comprehensive transaction tracking

## Monitoring

View logs in Vercel dashboard:
```
https://vercel.com/your-username/pos-webhooks/functions
```

## Error Handling

- **401**: Invalid webhook signature
- **405**: Wrong HTTP method (only POST allowed)
- **500**: Database or server error

## Performance

- Max duration: 10 seconds (Vercel free tier)
- Memory: 1024 MB
- Connection pooling limited to 1 connection (free tier optimization)
- Indexes on frequently queried columns

## Security

- HMAC SHA256 signature verification
- SQL injection prevention via parameterized queries
- Security headers configured in vercel.json
- Environment variables for sensitive data