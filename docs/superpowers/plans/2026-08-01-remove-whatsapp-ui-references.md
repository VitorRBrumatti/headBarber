# Remove WhatsApp UI References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Remove every user-visible promise or label related to WhatsApp messaging while preserving the existing mock, actions, database fields, and saved reminder value.

**Architecture:** Change only rendered copy and controls in the four affected React surfaces. A synchronous render test covers the public landing page, login, client form, and settings page; technical WhatsApp infrastructure remains untouched and continues to be covered by existing action audit tests.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, React server rendering.

## Global Constraints

- Preserve `src/lib/whatsapp.ts`, all mock calls, `whatsapp_confirmation_sent`, `whatsapp_reminder_hours`, and action contracts.
- Remove “WhatsApp” and promises of automatic customer notifications only from rendered UI.
- Keep the existing saved reminder value when settings are submitted.
- Use the existing dedicated worktree and branch `codex/client-subscriptions`.

---

### Task 1: Remove WhatsApp messaging from rendered surfaces

**Files:**
- Create: `tests/unit/no-whatsapp-ui.test.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/dashboard/client-form.tsx`
- Modify: `src/app/dashboard/configuracoes/configuracoes-client.tsx`

**Interfaces:**
- Consumes: `Home`, `LoginPage`, `ClientForm`, and `ConfiguracoesClient` React components.
- Produces: the same component exports and action payloads, without WhatsApp-related rendered copy.

- [x] **Step 1: Write the failing rendered-UI test**

Create `tests/unit/no-whatsapp-ui.test.ts` with framework/action mocks limited to external boundaries, render all four real components with `renderToStaticMarkup`, and assert each markup string does not match `/whatsapp/i` or contain `notificações automáticas`. Also assert the replacement landing benefit “Assinaturas de clientes” is rendered.

```ts
const surfaces = [
  ['landing', createElement(Home)],
  ['login', createElement(LoginPage)],
  ['client form', createElement(ClientForm, { onSuccess: vi.fn() })],
  ['settings', createElement(ConfiguracoesClient, { initialSettings: { whatsapp_reminder_hours: 2 }, barbers: [] })],
] as const

for (const [name, component] of surfaces) {
  const markup = renderToStaticMarkup(component)
  expect(markup, name).not.toMatch(/whatsapp/i)
  expect(markup, name).not.toContain('notificações automáticas')
}
```

- [x] **Step 2: Run the test and verify RED**

Run: `npm.cmd test -- tests/unit/no-whatsapp-ui.test.ts`

Expected: FAIL because all four surfaces currently render WhatsApp or automatic-notification copy.

- [x] **Step 3: Apply the minimal visual changes**

In `src/app/page.tsx`, replace the WhatsApp feature with:

```ts
{
  icon: "payments" as IconName,
  title: "Assinaturas de clientes",
  desc: "Crie planos recorrentes com benefícios e acompanhe os ciclos de cada cliente.",
}
```

Remove the now-unused `chat` icon type and SVG. In `src/app/login/page.tsx`, replace the notification phrase with `Centralize sua operação com uma gestão simples, organizada e eficiente.` In `src/components/dashboard/client-form.tsx`, render only `Telefone`. In `src/app/dashboard/configuracoes/configuracoes-client.tsx`, remove only the WhatsApp reminder `<label>`; keep `whatsappReminderHours` state and the action payload unchanged.

- [x] **Step 4: Run targeted tests and verify GREEN**

Run: `npm.cmd test -- tests/unit/no-whatsapp-ui.test.ts tests/unit/appointment-writers-audit.test.ts tests/unit/configuracoes-ui.test.ts`

Expected: all selected tests pass; the UI has no WhatsApp copy and the internal mock writers remain approved.

- [x] **Step 5: Run final gates**

Run `npm.cmd test`, lint the five changed source/test files, and run `npm.cmd run build` with the existing project environment loaded into the build process.

Expected: all tests pass, lint has no new errors, and the production build exits 0.

- [x] **Step 6: Commit and push**

```powershell
git add -- src/app/page.tsx src/app/login/page.tsx src/components/dashboard/client-form.tsx src/app/dashboard/configuracoes/configuracoes-client.tsx tests/unit/no-whatsapp-ui.test.ts docs/superpowers/plans/2026-08-01-remove-whatsapp-ui-references.md
git commit -m "fix: remove whatsapp messaging from ui"
git push origin codex/client-subscriptions
```