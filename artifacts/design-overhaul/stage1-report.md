# Stage 1 — implemented; final validation blocked

> Historical snapshot from the first redesign turn. Update 2026-10-17: the login failure was traced to the local test database missing the already-committed demo_mode column. That column was aligned locally without auth/RLS source changes. Outdated selectors in three existing tests were updated without weakening functional assertions. Current results: 267 unit tests and 14 E2E passed. The public profile and step-05 follow-up, screenshots and deployment caveat are documented in `../booking-profile/review.md`. Stage 2 has not started; the historical full-repository lint and original-reference asset limitations below have not been re-scoped or silently declared resolved.

2026-10-17. No push, deploy or production write. Stage 2 has NOT started: the requested strict validation gate remains closed because the complete E2E suite has four login/onboarding failures.

## Delivered

- Landing rebuilt as real Next/React components following the confirmed Hoffmann’s composition: four-line hero, official partnership, operation strip, three features, real booking screens, customization, two current plans, final CTA and footer.
- Existing HeadBarber and Hoffmann’s assets preserved. Official partner banner retained. Current plan prices and factual product content retained.
- Real demo captures of agenda, overview, finance and booking, exported to WebP. No generated dashboard or reference-image page background.
- Booking visual redesign across professional/service/additional/product/date/customer/review states, summary, confirming animation and authoritative receipt. Same callbacks, values, conditions and seven-step flow.
- Scoped CSS modules, keyboard focus, native controls, responsive layouts, reduced-motion behavior and restrained CSS hero/CTA motion. No runtime animation library added.
- Bootstrap inventory and motion/visual specification saved before implementation.

## Files

Modified: `src/app/landing-redesign.tsx`, `landing-pricing.tsx`; `src/app/booking/[slug]/{page,booking-client,booking-product-step,booking-summary-bar,booking-confirming,booking-success}.tsx`.

Created: `src/app/landing.module.css`, `src/app/booking/[slug]/booking.module.css`, `public/brand/product/*`, `tests/e2e/public-design.spec.ts`, and this evidence directory.

Tooling: `skills-lock.json` tracks installed skills; official Playwright setup added `.playwright-cli/` to `.gitignore`. Next dev automatically appended installed-version guidance to AGENTS.md. No package.json, dependency lockfile, backend, auth, API, database/migration, payment or dashboard source edits.

Skills actually consulted/applied: Find Skills, Ponytail, frontend-design, Impeccable context/craft/detector, curated image-to-code, official GSAP core/performance and LottieFiles motion-design for the motion specification, Vercel React/UI guidelines, fixing-accessibility, Playwright guidance, and Supabase for local test infrastructure. Installed-but-not-applied skills are distinguished in `bootstrap.md`. No image generation invoked; no external image generation costs incurred by this task.

## Validation

| Check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit`) | passed |
| Targeted ESLint on modified TSX and new E2E | passed |
| Full lint (`npm run lint`) | failed: 4,902 errors / 54,874 warnings across agent tooling and repository files; not corrected outside scope |
| Unit suite | 57 files / 256 tests passed |
| Build | passed; full route output in build.log |
| Real-browser public UI checks | passed at 1440, 768, 390; loaded images, no horizontal overflow, menu, disabled selection, forward/back, reduced motion, no uncaught page errors |
| New booking visual E2E | 3 passed; seven steps and receipt at all three widths; local test database only |
| Existing full E2E | 6 passed, 4 failed; all four time out in loginOwner waiting for dashboard after navigation to onboarding |
| Impeccable mechanical detector | empty finding list (`impeccable-detection.json`); this is not a fidelity or WCAG certification |
| Diff/behavior inspection | business control block in BookingClient byte-identical to HEAD after CRLF normalization; no functional backend files changed |

Failed existing E2E: professional historical snapshots (fails after successful public confirmation when entering owner dashboard), subscription lifecycle administration, stock/commission validation, and financial main flow. The shared failure is `tests/e2e/barber-service-fixture.ts:220` waiting for `/dashboard`, while the untouched auth path navigates to `/onboarding`. No baseline run on original source was performed, so these are NOT asserted to be pre-existing regressions. They remain unresolved and block full validation.

Local infrastructure: Docker Desktop was started and only the existing `*_headbarber` database/auth/rest/mail/gateway/realtime/storage/imgproxy containers were resumed. No containers/volumes were removed, database reset performed, migrations edited or production backend changed. E2E fixtures create local test records as designed by the existing tests.

## Visual evidence

- Before local/public landing: `before-{local,production}-{1440,768,390}.png`.
- Before booking: `before-booking-{1440,768,390}.png`, `before-booking-service-390.png`.
- After landing: `after-landing-{1440,768,390}.png`.
- After booking entry/service: `after-booking-{1440,768,390}.png`, `after-booking-service-{1440,768,390}.png`.
- All seven booking steps + receipt: `booking-step-{1..7,success}-{1440,768,390}.png`. These screenshots use explicit local E2E fixtures, not marketing mockup data.
- Marketing mockups: actual demo app screenshots in `/public/brand/product/`; fixture screenshots are not used as marketing assets.

## Reference comparison and remaining differences

No critical section-order, major alignment or horizontal-overflow issue was found in the inspected captures. No numeric fidelity score was invented.

Important differences retained deliberately to preserve product truth:

1. Actual agenda is light, while the reference illustrates a dark agenda. Dashboard redesign is outside scope, so a real light screenshot is shown.
2. Demo access prohibits the subscriptions admin route. Its feature uses a real overview image, identified in alt text, rather than an invented subscription screen.
3. Existing project photo replaces the reference barber/shop/laptop/chair photography. No official storefront or separate empty-chair photo was available; those images were not fabricated. Operation uses a real screen in a restrained frame, without inventing a laptop render.
4. Actual existing partner logo differs from the reference gold wordmark; preserved on a readable ivory backing. User explicitly confirmed using existing logos.
5. Public barbershop contract provides only id/name/slug: no address, cover or barbershop logo. No Maps link existed in this flow to preserve. Adding truthful location/profile imagery requires existing data to be supplied through an authorized contract change; none was invented.
6. Missing professional avatars use the existing fallback. Reference-generated people/products/reviews are not copied into actual business data.

Small differences: exact source typeface is unverified; existing Inter/Montserrat and the current official branding were retained. Mobile adaptations stack sections and provide a horizontal booking-screen strip because no mobile landing reference was supplied. Performance was not measured with Lighthouse or field data; no score or Core Web Vitals claim is made.

## Gate

Stage 1 is not declared fully concluded. The final auth-related E2E blocker must be resolved or explicitly scoped out before Stage 2 themes/i18n may start. The visual implementation and evidence are ready for review; the unresolved validation is not hidden behind a success claim.
