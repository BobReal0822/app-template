/**
 * `POST /api/webhooks/stripe` — Stripe webhook entry point.
 *
 * Reads the raw request body (required by Stripe signature verification) and
 * delegates to the pure handler. Configure this URL on the Stripe Dashboard
 * webhook endpoint.
 */

import { NextResponse } from 'next/server';

import { handleStripeWebhook } from '@/server/handlers/webhooks/stripe-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  const result = await handleStripeWebhook({ rawBody, signature });
  return NextResponse.json(result.body, { status: result.status });
}
