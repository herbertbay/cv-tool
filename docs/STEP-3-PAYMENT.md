# Step 3: Add payment: detailed checklist

Use this list when you’re ready to monetize Optimal CV. Do these on **your side** (accounts, legal, product decisions); implementation can follow.

---

## 1. Choose a payment provider

| Task | Notes |
|------|--------|
| [ ] **Pick provider** | **Stripe** (recommended): global, great docs, subscriptions + one-time. Alternatives: Paddle (handles VAT), Lemon Squeezy (indie-friendly). |
| [ ] **Create account** | Sign up at stripe.com (or chosen provider). Complete identity verification. |
| [ ] **Get API keys** | Copy **publishable key** (frontend) and **secret key** (backend). Never commit secret key; use env vars (e.g. `STRIPE_SECRET_KEY`). |
| [ ] **Configure webhook** | Add endpoint URL (e.g. `https://your-api.railway.app/api/webhooks/stripe`) and subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy **webhook signing secret** to env. |

---

## 2. Define your offer and pricing

| Task | Notes |
|------|--------|
| [ ] **Free tier** | Decide limits, e.g. “3 CVs per month” or “5 generations total”. Keep generous so ATS tool → first CV stays a strong lead magnet. |
| [ ] **Paid tier name** | e.g. “Pro” or “Unlimited”. |
| [ ] **Paid benefits** | Examples: unlimited CVs, no “Created with Optimal CV” on PDF, priority support, extra templates. Pick 1–2 to start. |
| [ ] **Price** | e.g. €9/month or €49/year. Check [BUSINESS-MODEL.md](./BUSINESS-MODEL.md) for context. |
| [ ] **Billing** | Monthly, yearly, or both. Yearly with a discount often converts better. |

---

## 3. Legal and compliance

| Task | Notes |
|------|--------|
| [ ] **Terms of Service** | Add a ToS page and link from footer/signup. Cover: use of the service, payment and refunds, account termination. |
| [ ] **Privacy Policy** | Already needed for GDPR; ensure it covers: what data you collect, how you use it, payment data (handled by Stripe; say so). |
| [ ] **Refund policy** | Define (e.g. “Refunds within 14 days, no questions asked”). Add to ToS and/or a short “Refunds” section. |
| [ ] **Cookie / consent** | If you use non-essential cookies (e.g. analytics), add a simple consent banner and document in Privacy Policy. |

---

## 4. Product and UX

| Task | Notes |
|------|--------|
| [ ] **Where to show paywall** | e.g. after N free CVs, or “Upgrade to remove branding”. Decide the exact moment (modal, inline message, or dedicated /pricing). |
| [ ] **Pricing page** | Create a page (e.g. `/pricing`) with plan name, price, benefits, and CTA to checkout. |
| [ ] **Account / billing page** | Logged-in users should see: current plan, “Upgrade” or “Manage subscription” (link to Stripe Customer Portal if you use it). |
| [ ] **“Manage subscription”** | Use Stripe Customer Portal (or provider equivalent) so users can update payment method, cancel, or switch plan without you building full UI. |

---

## 5. Backend and data

| Task | Notes |
|------|--------|
| [ ] **Store subscription state** | Add a field to users (e.g. `plan: 'free' | 'pro'`, `stripe_customer_id`, `stripe_subscription_id`). SQLite: new columns or a small `subscriptions` table. |
| [ ] **Enforce limits** | Before generating a CV: if user is free, check count of generations this month (or total). If over limit, return 402 or a clear “Upgrade to generate more” response. |
| [ ] **Webhook handler** | On `checkout.session.completed`: attach Stripe customer/subscription to user and set plan to paid. On `customer.subscription.deleted`: set plan back to free. |
| [ ] **Idempotency** | Make sure webhook handling is idempotent (same event twice = same result) so retries don’t double-apply. |

---

## 6. Frontend

| Task | Notes |
|------|--------|
| [ ] **Checkout flow** | “Upgrade” → create Stripe Checkout Session (backend) → redirect to Stripe-hosted checkout. After payment, redirect back to your app (e.g. /dashboard?success=1). |
| [ ] **Show plan and limits** | In header or settings: “Free (2/3 CVs this month)” or “Pro”. |
| [ ] **Hide/show PDF branding** | If “no branding” is a paid benefit, pass a flag when generating PDF and omit “Created with Optimal CV” for paid users. |

---

## 7. Go-live

| Task | Notes |
|------|--------|
| [ ] **Switch to live keys** | Replace Stripe test keys with live keys in production env. |
| [ ] **Test live flow** | Do one real payment (you can refund). Confirm: checkout → webhook → user marked as paid → limits and branding behave correctly. |
| [ ] **Invoices** | Stripe sends invoices by default. Optionally add “Invoices” link (Stripe Customer Portal) on the account page. |

---

## 8. Optional later

- **Coupons / discounts** for launch or referrals.
- **Annual plan** with one month free.
- **“Lifetime” one-time** (use Stripe one-time payment; no subscription).
- **Referral rewards** (e.g. “Give a friend 1 free CV; you get 1 extra”).

---

## Summary order

1. **Provider + account** → API keys + webhook URL and secret.  
2. **Offer** → Free limits, paid benefits, price, billing interval.  
3. **Legal** → ToS, Privacy, refunds, cookies if needed.  
4. **Product** → Where to show paywall, pricing page, account/billing page.  
5. **Backend** → Subscription state, limits, webhook handler.  
6. **Frontend** → Checkout redirect, plan display, PDF branding toggle.  
7. **Go-live** → Live keys, one real test payment, invoices.

For implementation details (code), see the codebase and Stripe docs (Checkout, Customer Portal, Webhooks). This doc is your **ops and product checklist** so you know what you have to do on your side before and while payment is built.
