import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { sendPaymentFailedEmail } from '@/lib/resend';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getStripeId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

async function findUserByCustomerId(customerId: string) {
  const { data } = await db
    .from('User')
    .select('id, email')
    .eq('stripeCustomerId', customerId)
    .single();

  return data ?? null;
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Configuration manquante: STRIPE_WEBHOOK_SECRET.' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header.' },
      { status: 400 }
    );
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[STRIPE_WEBHOOK_SIGNATURE_ERROR]', error);
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error(`[STRIPE_WEBHOOK_HANDLER_ERROR] ${event.type}`, error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = getStripeId(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  const subscriptionId = getStripeId(
    session.subscription as string | Stripe.Subscription | null
  );
  const userId = session.metadata?.userId;

  if (!userId && !customerId) {
    return;
  }

  const query = db.from('User').update({
    stripeCustomerId: customerId || undefined,
    stripeSubscriptionId: subscriptionId || undefined,
    subscriptionStatus: 'active',
  });

  if (userId) {
    await query.eq('id', userId);
    return;
  }

  await query.eq('stripeCustomerId', customerId);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  const userId = subscription.metadata?.userId;

  const query = db.from('User').update({
    stripeCustomerId: customerId || undefined,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  });

  if (userId) {
    await query.eq('id', userId);
    return;
  }

  if (customerId) {
    await query.eq('stripeCustomerId', customerId);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  const userId = subscription.metadata?.userId;

  const query = db.from('User').update({
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
  });

  if (userId) {
    await query.eq('id', userId);
    return;
  }

  if (customerId) {
    await query.eq('stripeCustomerId', customerId);
    return;
  }

  await query.eq('stripeSubscriptionId', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getStripeId(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  const userId = subscription.metadata?.userId;

  const query = db.from('User').update({
    plan: 'FREE',
    stripeSubscriptionId: null,
    subscriptionStatus: 'canceled',
  });

  if (userId) {
    await query.eq('id', userId);
    return;
  }

  if (customerId) {
    await query.eq('stripeCustomerId', customerId);
    return;
  }

  await query.eq('stripeSubscriptionId', subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = getStripeId(invoice.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  if (!customerId) return;

  await db
    .from('User')
    .update({ subscriptionStatus: 'active' })
    .eq('stripeCustomerId', customerId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getStripeId(invoice.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  if (!customerId) return;

  await db
    .from('User')
    .update({ subscriptionStatus: 'past_due' })
    .eq('stripeCustomerId', customerId);

  const user = await findUserByCustomerId(customerId);
  if (user?.email) {
    sendPaymentFailedEmail(user.email).catch(() => {});
  }
}
