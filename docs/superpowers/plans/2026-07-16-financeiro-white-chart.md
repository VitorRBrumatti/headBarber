# Financeiro White Surfaces and Readable Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter todo o Financeiro branco em qualquer preferência de tema e tornar o gráfico legível, inclusive quando o período não possui movimentações.

**Architecture:** A correção permanece isolada em `FinanceiroClient`: superfícies ganham overrides de tema com prioridade e o gráfico SVG passa a distinguir estado com dados de estado vazio. Nenhuma regra financeira, consulta ou Server Action muda.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, SVG e Playwright 1.60.

## Global Constraints

- Fundo do Financeiro e superfícies: `#ffffff` em temas claro e escuro.
- Texto principal: `#181c21`; texto secundário: `#47464b`.
- Receita: `#C79A4A`; despesa: `#ba1a1a`.
- Não alterar `Card` global, Supabase, cálculos ou dependências.
- Validar em desktop 1440×1000, mobile 390×844 e `colorScheme: dark`.

---

### Task 1: Fix the Financeiro light-surface contract

**Files:**
- Modify: `src/app/dashboard/financeiro/financeiro-client.tsx`
- Temporary QA only: local Playwright preview outside committed artifacts

**Interfaces:**
- Consumes: `Card` global com variantes `dark:*`.
- Produces: superfícies do Financeiro que permanecem brancas independentemente do tema.

- [ ] **Step 1: Reproduce the dark-theme failure**

Renderizar o Financeiro com `page.emulateMedia({ colorScheme: 'dark' })` e verificar:

```ts
const surface = page.getByTestId('metric-total-revenues').locator('..')
await expect(surface).toHaveCSS('background-color', 'rgb(255, 255, 255)')
```

Expected before implementation: FAIL porque o `Card` resolve para cinza escuro.

- [ ] **Step 2: Apply scoped light overrides**

Atualizar as classes compartilhadas e o contêiner:

```ts
const financeSurface = 'border !border-[#e0e2e9] !bg-white !text-[#181c21] shadow-[0_4px_12px_rgba(27,27,30,0.04)] dark:!border-[#e0e2e9] dark:!bg-white dark:!text-[#181c21] dark:!backdrop-blur-none'
```

```tsx
<div className="mx-auto w-full min-w-0 max-w-[1400px] ... bg-white [color-scheme:light]">
```

Também forçar branco nos estados vazios, filtros e trilhas que possam herdar tema escuro.

- [ ] **Step 3: Verify the surface contract**

Executar novamente o Playwright com tema escuro.

Expected: todos os cards principais retornam `rgb(255, 255, 255)` e textos permanecem legíveis.

---

### Task 2: Improve chart readability and zero state

**Files:**
- Modify: `src/app/dashboard/financeiro/financeiro-client.tsx`
- Test: `tests/e2e/fluxo-principal.spec.ts` (contrato existente permanece intacto)

**Interfaces:**
- Consumes: `datePoints`, `linePath`, `areaPath` e `maxValue` atuais.
- Produces: gráfico SVG claro com estado vazio explícito.

- [ ] **Step 1: Define the activity condition**

Adicionar depois de `maxValue`:

```ts
const hasChartActivity = datePoints.some((point) => point.revenue > 0 || point.expense > 0)
```

- [ ] **Step 2: Implement the empty state and readable plot**

Quando `hasChartActivity` for falso, renderizar dentro do card:

```tsx
<div className="mt-6 flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-[#d8dbe3] bg-white px-6 text-center">
  <div>
    <TrendingUp className="mx-auto h-6 w-6 text-[#C79A4A]" />
    <p className="mt-3 font-montserrat text-sm font-semibold text-[#181c21]">Nenhuma movimentação no período</p>
    <p className="mt-1 text-xs text-[#47464b]">Receitas e despesas aparecerão aqui quando forem registradas.</p>
  </div>
</div>
```

Quando houver dados, manter o SVG com:

```tsx
className="h-[280px] min-w-[680px] w-full rounded-lg bg-white"
```

Usar grade `#eceef4`, rótulos `#47464b` com 11 px, receita dourada com 3.5 px, despesa vermelha com 3 px e círculos de 3.5 px em cada ponto.

- [ ] **Step 3: Run focused verification**

```powershell
npm run lint -- src/app/dashboard/financeiro/financeiro-client.tsx tests/e2e/fluxo-principal.spec.ts
npm test -- tests/unit/actions.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run visual QA**

Verificar por Playwright:

```text
1440×1000 claro: cards brancos e gráfico com dados.
1440×1000 escuro: mesma aparência branca.
390×844 escuro: sem overflow horizontal.
Período zerado: estado vazio, sem linha vermelha no eixo.
```

- [ ] **Step 5: Commit**

```powershell
git add src/app/dashboard/financeiro/financeiro-client.tsx tests/e2e/fluxo-principal.spec.ts
git commit -m "fix: keep financial dashboard light and clarify chart"
```
