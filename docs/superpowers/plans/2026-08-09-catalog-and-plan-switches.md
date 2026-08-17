# Catalog and Plan Switches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible raw checkboxes in service, add-on, and plan-editing flows with one accessible HeadBarber switch component.

**Architecture:** Add a controlled `Switch` primitive that retains a native checkbox for semantics and keyboard behavior while rendering a branded visual track. Reuse it in catalog cards, editor forms, professional availability rows, and a focused plan-benefit row component without changing server actions or persisted data.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Vitest, React DOM server rendering.

## Global Constraints

- Preserve all existing state transitions, server actions, and `FormData` field values.
- Use the existing neutral palette with `#7c5809`/`#C79A4A` only for active and focus states.
- Keep native keyboard behavior, visible focus, a 44px touch target, disabled styling, and reduced-motion support.
- Do not add a component dependency or redesign unrelated controls.

---

### Task 1: Shared Switch Primitive

**Files:**
- Create: `src/components/ui/switch.tsx`
- Create: `tests/unit/switch.test.tsx`

**Interfaces:**
- Produces: `Switch(props)` with native input props except `type`, plus `onCheckedChange?: (checked: boolean) => void`.

- [x] **Step 1: Write the failing component test**

Render checked and disabled switches with `renderToStaticMarkup`. Assert `role="switch"`, the accessible label, `aria-checked`, native checked state, and disabled state.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/switch.test.tsx`

Expected: FAIL because `@/components/ui/switch` does not exist.

- [x] **Step 3: Implement the minimal switch**

Create a client component containing an `sr-only` native checkbox and a sibling visual track. Forward checked changes through `onCheckedChange`, use `peer-focus-visible` for focus, `peer-disabled` for disabled state, and `motion-reduce:transition-none` for reduced motion.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- tests/unit/switch.test.tsx`

Expected: 2 tests pass.

### Task 2: Service and Add-on Integration

**Files:**
- Modify: `src/app/dashboard/servicos/services-client.tsx`
- Modify: `src/app/dashboard/adicionais/adicionais-client.tsx`
- Modify: `src/components/dashboard/service-form.tsx`
- Modify: `src/components/dashboard/add-on-form.tsx`
- Modify: `src/components/dashboard/service-assignments-editor.tsx`
- Modify: `src/components/dashboard/add-on-assignments-editor.tsx`
- Create: `tests/unit/catalog-switches-ui.test.tsx`

**Interfaces:**
- Consumes: `Switch` from Task 1.
- Preserves: `toggleServiceStatus`, `toggleAddOnStatus`, `setIsActive`, and assignment `onChange` calls.

- [x] **Step 1: Write failing integration tests**

Server-render one active service card, one active add-on card, both editor forms, and professional assignment rows. Assert every affected control renders `role="switch"` next to its existing label.

- [x] **Step 2: Run the integration test and verify RED**

Run: `npm test -- tests/unit/catalog-switches-ui.test.tsx`

Expected: FAIL because the existing controls render as plain checkboxes.

- [x] **Step 3: Replace raw controls with Switch**

Use `onCheckedChange` to call the exact existing handlers. Keep card-level `disabled={isPending}` and preserve each current text label.

- [x] **Step 4: Run component and integration tests**

Run: `npm test -- tests/unit/switch.test.tsx tests/unit/catalog-switches-ui.test.tsx`

Expected: all focused tests pass.

### Task 3: Plan Benefit Integration and Verification

**Files:**
- Create: `src/app/dashboard/financeiro/assinaturas/plan-benefit-row.tsx`
- Modify: `src/app/dashboard/financeiro/assinaturas/subscriptions-client.tsx`
- Modify: `tests/unit/client-subscriptions-ui.test.tsx`

**Interfaces:**
- Consumes: `Switch` from Task 1.
- Produces: `PlanBenefitRow({ name, selected, limit, onSelectedChange, onLimitChange })`.
- Preserves: `toggleBenefit(key, selected)` and `updateBenefitLimit(key, limit)`.

- [x] **Step 1: Add a failing plan-benefit rendering test**

Render `PlanBenefitRow` selected and unselected. Assert it exposes a switch, keeps the benefit name as its label, and disables the limit input when unselected.

- [x] **Step 2: Run the plan UI test and verify RED**

Run: `npm test -- tests/unit/client-subscriptions-ui.test.tsx`

Expected: FAIL because `PlanBenefitRow` does not exist.

- [x] **Step 3: Implement and integrate PlanBenefitRow**

Move the current benefit row markup into the focused component, replace its checkbox with `Switch`, and pass the existing selected and limit handlers from `SubscriptionsClient`.

- [x] **Step 4: Run all relevant tests**

Run: `npm test -- tests/unit/switch.test.tsx tests/unit/catalog-switches-ui.test.tsx tests/unit/client-subscriptions-ui.test.tsx tests/unit/service-admin-contract.test.ts tests/unit/add-on-admin.test.ts tests/unit/plans.test.ts`

Expected: all tests pass.

- [x] **Step 5: Run static verification**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npm run build`

Expected: exit code 0 with a successful production build.

- [x] **Step 6: Review the final diff and commit**

Run: `git diff --check` and inspect `git diff` for scope. Commit the plan, tests, component, and integrations with `feat: replace catalog checkboxes with switches`.
