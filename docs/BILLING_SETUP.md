# Billing setup

The application only grants product access when the authenticated user has a Stripe subscription with status `active` or `trialing`.

## 1. Supabase

Run `supabase/migrations/20240526_billing_subscriptions.sql` in the Supabase SQL Editor or through your migration workflow.

Copy the project's service role key to `SUPABASE_SERVICE_ROLE_KEY`. This key is server-only and must never use the `NEXT_PUBLIC_` prefix.

## 2. Stripe products and prices

In Stripe Dashboard, create one product named **HeadBarber - Plano Profissional** with two recurring prices:

| Environment variable | Amount | Recurrence |
| --- | ---: | --- |
| `STRIPE_MONTHLY_PRICE_ID` | BRL 24.90 | Monthly |
| `STRIPE_ANNUAL_PRICE_ID` | BRL 249.99 | Yearly |

Copy each generated `price_...` ID to the matching environment variable.

## 3. Stripe webhook

Create a webhook endpoint:

```text
https://head-barber.vercel.app/api/stripe/webhook
```

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy its signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`.

For local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 4. Vercel variables

Configure these variables for Production and Preview:

- `NEXT_PUBLIC_APP_URL=https://head-barber.vercel.app`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_ANNUAL_PRICE_ID`
- `SUPABASE_SERVICE_ROLE_KEY`

Redeploy after changing variables.

## 5. Stripe Customer Portal

Enable the Customer Portal in Stripe Dashboard so subscribed users can update payment details, view invoices, and cancel renewal.

## 6. Vercel observability

`@vercel/analytics` and `@vercel/speed-insights` are mounted in the root layout. After deployment, verify incoming data in the project's Analytics and Speed Insights tabs.
