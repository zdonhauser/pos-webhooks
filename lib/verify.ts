import crypto from 'crypto';

export function verifyShopifyWebhook(
  rawBody: string | Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) {
    console.error('No signature provided in X-Shopify-Hmac-Sha256 header');
    return false;
  }

  const body = typeof rawBody === 'string' ? rawBody : rawBody.toString();

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  const isValid = hash === signature;

  if (!isValid) {
    console.error('Webhook signature validation failed');
    console.error('Expected:', hash);
    console.error('Received:', signature);
  }

  return isValid;
}