# HeadBarber — Stage 1 visual contract

2026-10-17. User confirmed: composition = `Landing Page HeadBarber com Hoffmann’s Barber.png`; brand = existing project logos. No invented dashboard, business data, reviews or partner marks.

## Scope and preserved behavior

Landing: `src/app/landing-redesign.tsx`, `landing-pricing.tsx`, a scoped CSS module and existing public brand assets. Booking: visual classes in client, progress, product selection, summary and success. Keep all callbacks, validation, conditional steps, server actions, availability calculations and authoritative receipt fields. No changes to auth, payment, database or API contracts. Stage 2 waits for Stage 1 validation.

## Composition

Reference is 725×2170. Its desktop composition scales to a 1320px content region at 1440px viewport, with 60px side gutters. Header 72px; hero approximately 800px with left copy 44% and right real product capture 56%. Headline has four intentional lines: Menos tempo / na gestão. / Mais tempo / na cadeira. Black field, photographic barber at left, product screen at right. Four small capability labels below CTAs.

Order: header/hero → official Hoffmann’s partnership → photographic operation strip → ivory features (agenda, subscriptions, finance) → black three-step booking demonstration → ivory customization → black pricing (intro + two plans) → photographic final CTA → compact footer. Preserve this order and relative proportions. Real product captures replace reference-generated UI. Pricing comes from PLAN_DETAILS and current included features, never reference-only claims about extra barber fees.

Colors: near-black #0c0d0d, charcoal #191a19, ivory #f6f2e9, gold #c79a4a, muted gold #d6b475, dark text #171918, body #5e5a53. Headline Inter with existing Montserrat for brand, tightly spaced, 64–72px desktop / 42px mobile. H2 44–52px desktop / 32px mobile. Body 16px / 1.55. CTA 46–50px high, 6px radius, restrained border. No decorative glow or glass.

Tablet: 32px gutters; hero stacks below 1000px; feature triptych remains readable or stacks; partnership stacks at narrow widths. Mobile: 20px gutters; 42px hero; screen shown below copy; booking screenshots in horizontal scroll with visible adjacent content; pricing stacks; compact expandable navigation with keyboard focus. No page-wide horizontal overflow.

## Booking

Use attached seven dark/gold booking references for color, image shape, selection and spacing, retaining existing seven-step sequence and controls. Centered max-width 768px task area; dark background, charcoal choices, 12px radius, gold selected outlines, readable metadata. Use real current professional/product images and fallbacks. Do not copy invented people, service prices or product labels from references. Confirmation remains current BookingSuccess and current receipt.

Existing public barbershop contract exposes id/name/slug only. It does not expose address, cover or shop logo. Google Maps/profile imagery cannot be truthfully added under the no-contract-change constraint. Document this limitation rather than inventing a location.

## Motion storyboard

| Element | Intent / trigger | Timing / easing | Properties | Mobile / reduced motion |
|---|---|---|---|---|
| Hero heading and copy | Establish reading order on load | 550ms cubic-bezier(.16,1,.3,1), 80ms offset | translateY 12px, opacity .8→1 | 8px distance; none when reduced |
| Hero product capture | Resolve product after title | 700ms same easing, 140ms delay | translateY 20px, opacity .85→1 | 10px distance; none when reduced |
| Primary CTA | Action feedback on hover/press | 160ms ease-out | translateY -2px / scale .99 | hover only pointer fine; no transform when reduced |
| Booking option | Selected feedback on click | 160ms ease-out | border/background color | same mobile; immediate reduced |
| Progress | Existing step feedback | existing 300ms | existing progress width | preserve existing reduced-motion rule |

Applied guidance: official GSAP performance (transform/opacity, no scroll hijack or unnecessary engine), LottieFiles timing/choreography (one hero sequence, immediate feedback), Impeccable reference fidelity and accessibility, Ponytail reuse and no unnecessary runtime dependency. CSS is sufficient; do not ship GSAP/Lottie/Motion/Anime/React Spring engines solely because skills were installed.

## Evidence and verification

Before captures: `before-local-{1440,768,390}.png`, `before-production-{1440,768,390}.png`, `before-booking-{1440,768,390}.png`, `before-booking-service-390.png`. Captured using real Chromium and the running app. No reservation submitted.

Required next: rendered after captures, structural comparison, keyboard/menu/selection checks, reduced motion, console inspection, lint/typecheck/build and relevant booking tests. No quality percentage inferred from subjective comparison.
