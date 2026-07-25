# Agenda Layout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o transbordamento dos cards e estabelecer uma densidade equilibrada e responsiva na agenda diária.

**Architecture:** Manter a grade CSS existente e reduzir suas dimensões para uma escala de 56/64/72 px. Simplificar a composição interna das reservas para duas faixas e isolar em uma função pura a decisão de repetir ou omitir rótulos de indisponibilidade.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, TypeScript, Tailwind CSS 4, Vitest, Playwright.

## Global Constraints

- Preservar regras de disponibilidade, cálculo de duração e fluxo de criação/edição.
- Manter Montserrat/Inter, neutros atuais e dourado `#C79A4A`.
- Usar densidade equilibrada: cabeçalho 56 px, intervalo 64 px e coluna de horário 72 px.
- Manter foco visível, áreas de toque e contraste compatíveis com WCAG 2.1 AA.
- Não alterar banco de dados, migrations ou contratos de servidor.

---

### Task 1: Evitar repetição de rótulos indisponíveis

**Files:**
- Modify: `src/app/dashboard/agenda/agenda-grid-utils.ts`
- Test: `tests/unit/agenda-grid-utils.test.ts`

**Interfaces:**
- Consumes: `AgendaCellState` retornado por `getAgendaCellState`.
- Produces: `shouldShowUnavailableLabel(currentState, previousState): boolean`.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar:

```ts
import { shouldShowUnavailableLabel } from '@/app/dashboard/agenda/agenda-grid-utils'

describe('agenda unavailable labels', () => {
  it('shows the first label and suppresses contiguous repetitions', () => {
    expect(shouldShowUnavailableLabel('lunch', 'available')).toBe(true)
    expect(shouldShowUnavailableLabel('lunch', 'lunch')).toBe(false)
    expect(shouldShowUnavailableLabel('blocked', 'lunch')).toBe(true)
  })
})
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run:

```bash
npm test -- tests/unit/agenda-grid-utils.test.ts
```

Expected: FAIL porque `shouldShowUnavailableLabel` ainda não existe.

- [ ] **Step 3: Implementar a função mínima**

Adicionar:

```ts
export function shouldShowUnavailableLabel(
  currentState: AgendaCellState,
  previousState: AgendaCellState | undefined,
) {
  return currentState !== 'available' && currentState !== previousState
}
```

- [ ] **Step 4: Executar o teste novamente**

Run:

```bash
npm test -- tests/unit/agenda-grid-utils.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/agenda/agenda-grid-utils.ts tests/unit/agenda-grid-utils.test.ts
git commit -m "test: define compact agenda unavailable labels"
```

---

### Task 2: Compactar grade e cards de reservas

**Files:**
- Modify: `src/app/dashboard/agenda/agenda-grid.tsx`
- Test: `tests/unit/agenda-grid-render.test.tsx`

**Interfaces:**
- Consumes: `shouldShowUnavailableLabel`, `AgendaGridProps`, `AppointmentDetails`.
- Produces: grade com `data-agenda-density="balanced"` e card com metadados contidos.

- [ ] **Step 1: Escrever o contrato de renderização que falha**

Adicionar às expectativas:

```ts
expect(markup).toContain('data-agenda-density="balanced"')
expect(markup).toContain('data-appointment-card="compact"')
expect(markup).toContain('09:00–10:00')
expect(markup).toContain('R$')
```

Adicionar um segundo cenário com dois intervalos de almoço e conferir:

```ts
expect(markup.match(/>Almoço</g)).toHaveLength(1)
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run:

```bash
npm test -- tests/unit/agenda-grid-render.test.tsx
```

Expected: FAIL nos novos contratos de densidade e repetição.

- [ ] **Step 3: Ajustar as dimensões da grade**

Usar:

```tsx
<div
  className="grid"
  data-agenda-density="balanced"
  style={{
    gridTemplateColumns: `72px repeat(${barbers.length}, minmax(240px, 1fr))`,
    gridTemplateRows: `56px repeat(${slots.length}, 64px)`,
    minWidth: Math.max(760, 72 + barbers.length * 240),
  }}
>
```

Manter o cabeçalho sticky e reduzir avatar para `h-8 w-8`.

- [ ] **Step 4: Reorganizar o card em duas faixas**

Usar:

```tsx
<button
  data-appointment-card="compact"
  className={cn(
    'grid h-full w-full grid-rows-[auto_1fr] rounded-lg border-l-[3px] px-3 py-2 text-left',
    presentation.className,
  )}
>
  <span className="flex min-w-0 items-center justify-between gap-2">
    <span className="truncate text-xs font-bold">
      {appointment.client.name}
    </span>
    <span className={cn(
      'shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em]',
      presentation.badgeClassName,
    )}>
      {presentation.label}
    </span>
  </span>
  <span className="mt-1 flex min-w-0 items-end justify-between gap-3 text-[10px]">
    <span className="min-w-0 truncate">
      {appointment.serviceName} · {timeFromIso(appointment.startAt)}–
      {timeFromIso(appointment.endAt)}
    </span>
    <span className="shrink-0 font-bold">
      {money(appointment.attendanceTotal)}
    </span>
  </span>
</button>
```

- [ ] **Step 5: Omitir rótulos indisponíveis repetidos**

Calcular o estado do intervalo anterior para o mesmo barbeiro e passar
`showLabel={shouldShowUnavailableLabel(cellState, previousCellState)}` para
`UnavailableCell`. Quando `showLabel` for falso, manter ícone e texto somente
para leitores de tela:

```tsx
<span className={showLabel ? undefined : 'sr-only'}>
  {presentation.label}
</span>
```

- [ ] **Step 6: Executar os testes da agenda**

Run:

```bash
npm test -- tests/unit/agenda-grid-render.test.tsx tests/unit/agenda-grid-utils.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/agenda/agenda-grid.tsx tests/unit/agenda-grid-render.test.tsx
git commit -m "fix: compact daily agenda cards"
```

---

### Task 3: Harmonizar o cabeçalho e a responsividade

**Files:**
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Test: `tests/unit/agenda-grid-render.test.tsx`

**Interfaces:**
- Consumes: navegação existente por data e `openBlankCreate`.
- Produces: toolbar responsiva com controles de 44 px e agrupamentos consistentes.

- [ ] **Step 1: Adicionar contratos estáveis**

Adicionar atributos semânticos:

```tsx
<header data-agenda-header="balanced">
<div data-agenda-toolbar="responsive">
```

E testar:

```ts
expect(source).toContain('data-agenda-header="balanced"')
expect(source).toContain('data-agenda-toolbar="responsive"')
```

- [ ] **Step 2: Executar o teste e confirmar a falha**

Run:

```bash
npm test -- tests/unit/agenda-grid-render.test.tsx
```

Expected: FAIL porque os atributos ainda não existem.

- [ ] **Step 3: Aplicar o layout responsivo**

Usar no contêiner da página `space-y-5 p-4 sm:p-6 lg:p-8`, no cabeçalho
`gap-4 pb-5`, e na toolbar:

```tsx
<div
  className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center"
  data-agenda-toolbar="responsive"
>
```

Manter cada controle com `h-11`; em viewport estreita, navegação, data e botão
devem usar `w-full`, retornando a largura automática em `sm`.

- [ ] **Step 4: Rodar lint e testes**

Run:

```bash
npx eslint src/app/dashboard/agenda/agenda-client.tsx src/app/dashboard/agenda/agenda-grid.tsx
npm test -- tests/unit/agenda-grid-render.test.tsx tests/unit/agenda-grid-utils.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/agenda/agenda-client.tsx tests/unit/agenda-grid-render.test.tsx
git commit -m "fix: align agenda header controls"
```

---

### Task 4: Validar a agenda renderizada

**Files:**
- Verify: `src/app/dashboard/agenda/*`

**Interfaces:**
- Consumes: aplicação integrada e dados reais/locais da agenda.
- Produces: evidência visual desktop e mobile e uma árvore pronta para publicação.

- [ ] **Step 1: Executar a suíte completa**

Run:

```bash
npm test
npm run build
```

Expected: 29 arquivos/104 testes ou mais aprovados e build concluído.

- [ ] **Step 2: Validar no navegador em desktop**

Abrir `/dashboard/agenda`, confirmar identidade da página, ausência de overlay e
erros relevantes no console, trocar a data e abrir uma reserva.

- [ ] **Step 3: Comparar com a referência**

Confirmar visualmente:

- nenhum texto cruza a borda inferior do card;
- horário e valor ficam dentro do fundo colorido;
- linhas livres não parecem excessivamente altas;
- toolbar e título mantêm alinhamento;
- rótulos de almoço não se repetem em sequência.

- [ ] **Step 4: Validar viewport móvel**

Em largura próxima a 390 px, confirmar toolbar empilhada, controles tocáveis,
grade com rolagem horizontal e ausência de sobreposição.

- [ ] **Step 5: Commit final, se necessário**

```bash
git add src/app/dashboard/agenda tests/unit
git commit -m "test: verify agenda layout polish"
```
