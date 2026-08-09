# Reservas Redesign and Client Subscription Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o redesign responsivo de Reservas e corrigir as tags de Clientes para refletirem apenas assinaturas ativas.

**Architecture:** As páginas servidoras continuam responsáveis pelas consultas Supabase e entregam dados serializáveis aos componentes clientes. A regra de exibição da assinatura será isolada em um pequeno helper testável; a página de Reservas continuará filtrando localmente, mas sua apresentação será reorganizada em componentes focados para cabeçalho, toolbar, listagem e detalhes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Vitest, lucide-react.

## Global Constraints

- Preservar o `DashboardShell`, consultas históricas, mapeadores e regras financeiras existentes.
- Somente `client_subscriptions.status = 'active'` exibe o nome do plano; todos os demais clientes exibem `Regular`.
- Não inferir assinatura por observações ou posição na lista.
- Nomes longos de planos devem usar reticências e expor o conteúdo completo por hover/foco.
- Reservas deve usar tabela no desktop, cartões no mobile e painel lateral acessível.
- Não adicionar dependências.

---

### Task 1: Fonte real e apresentação das tags de assinatura

**Files:**
- Create: `src/app/dashboard/clientes/client-subscription-label.ts`
- Modify: `src/app/dashboard/clientes/page.tsx`
- Modify: `src/app/dashboard/clientes/clientes-client.tsx`
- Create: `tests/unit/client-subscription-label.test.ts`
- Modify: `tests/unit/client-subscriptions-ui.test.tsx`

**Interfaces:**
- Produces: `getClientSubscriptionLabel(activePlanName: string | null): { label: string; isSubscriber: boolean }`.
- `ClientesClient` receives `activePlanNamesByClientId: Record<string, string>`.

- [ ] **Step 1: Write failing helper and source-contract tests**

```ts
expect(getClientSubscriptionLabel('Clube Executivo')).toEqual({ label: 'Clube Executivo', isSubscriber: true })
expect(getClientSubscriptionLabel(null)).toEqual({ label: 'Regular', isSubscriber: false })
expect(clientSource).not.toContain("idx % 4")
expect(clientSource).not.toContain("includes('premium')")
expect(pageSource).toContain(".eq('status', 'active')")
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test -- tests/unit/client-subscription-label.test.ts tests/unit/client-subscriptions-ui.test.tsx`
Expected: FAIL because the helper and active-subscription contract do not exist.

- [ ] **Step 3: Implement active subscription query and map**

Query `client_subscriptions` for `client_id`, `status` and joined `subscription_plans(name)`, scoped by `barbershop_id` and `status = active`; throw on query error; reduce valid rows into `Record<string, string>` and pass it to `ClientesClient`.

- [ ] **Step 4: Render real labels with accessible truncation**

Use the helper for avatar/tag variants. Render the plan label in a focusable `span` with `max-w`, `truncate`, `title={label}` and `aria-label={label}`. Preserve the neutral `Regular` styling.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/client-subscription-label.test.ts tests/unit/client-subscriptions-ui.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/app/dashboard/clientes tests/unit/client-subscription-label.test.ts tests/unit/client-subscriptions-ui.test.tsx
git commit -m "fix: show active subscription names for clients"
```

### Task 2: Redesign responsivo do histórico de reservas

**Files:**
- Modify: `src/app/dashboard/reservas/reservas-client.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: `AppointmentDetails[]` and the existing `Sheet` component.
- Produces: search/status filtered desktop table, mobile cards and complete detail sheet.

- [ ] **Step 1: Extend failing source-contract tests**

```ts
expect(file).toContain('reservas encontradas')
expect(file).toContain('aria-label="Buscar reservas"')
expect(file).toContain('hidden md:table')
expect(file).toContain('md:hidden')
expect(file).toContain('Observações')
expect(file).toContain('selected.notes')
```

- [ ] **Step 2: Run reservation test and confirm failure**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`
Expected: FAIL on the new structural expectations.

- [ ] **Step 3: Add presentation helpers**

Define status labels/styles, localized compact and full date formatters, client initials, active product filtering, subtotal calculations and a reusable status badge inside the module.

- [ ] **Step 4: Build header and toolbar**

Implement the Stitch hierarchy with the gold Reservas marker, title/subtitle, filtered result count, search field with icon and status selector. Preserve controlled state and reset-safe filtering.

- [ ] **Step 5: Build desktop table and mobile cards**

Desktop columns: date/time, client, service, professional, attendance total, status and chevron. Mobile cards expose the same data. Rows/cards are keyboard-accessible buttons with visible focus and selected-state feedback.

- [ ] **Step 6: Rebuild the details sheet**

Render client identity and status, service/professional/date/duration grid, itemized service/add-ons totals, conditional subscription panel, active products, final total and conditional notes. Empty sections use explicit neutral copy and no invented data.

- [ ] **Step 7: Run focused reservation tests**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/app/dashboard/reservas/reservas-client.tsx tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: redesign reservations history"
```

### Task 3: Regression and visual verification

**Files:**
- Modify only if verification exposes a defect in Task 1 or Task 2 files.

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: validated responsive behavior and passing repository checks.

- [ ] **Step 1: Run lint and unit suite**

Run: `npm run lint`
Expected: zero errors in changed files.

Run: `npm test`
Expected: all unit tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Next.js production build succeeds.

- [ ] **Step 3: Verify browser behavior**

Open `/dashboard/clientes` and `/dashboard/reservas`; check desktop and mobile widths, search, status filter, row/card selection, Escape/overlay close, tag truncation and full plan name tooltip.

- [ ] **Step 4: Compare rendered Reservas screen to the Stitch reference**

Capture the latest desktop and mobile screens and inspect them alongside the supplied HTML reference. Correct spacing, typography, color, overflow and drawer fidelity until no material mismatch remains.

- [ ] **Step 5: Commit verification fixes if needed**

```bash
git add src/app/dashboard/clientes src/app/dashboard/reservas tests/unit
git commit -m "fix: polish reservations and client tags"
```
