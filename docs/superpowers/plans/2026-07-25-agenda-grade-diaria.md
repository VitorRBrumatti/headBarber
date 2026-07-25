# Agenda em Grade Diária Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a Agenda como uma grade diária por barbeiro e horário, com criação manual e detalhes em sidebars, preservando os contratos atuais de reserva.

**Architecture:** A página de servidor carrega reservas, barbeiros, configurações, expedientes e bloqueios serializáveis. Funções puras em `agenda-grid-utils.ts` derivam intervalos e estados da grade; `AgendaClient` coordena navegação e sidebars, enquanto componentes focados renderizam a grade e os formulários.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript 5, Tailwind CSS 4, Vitest 4 e Playwright 1.60.

## Global Constraints

- Manter a página como Server Component e a interação dentro do limite existente de Client Component.
- Continuar usando `next/navigation`, `createAdminAppointment`, `getAdminBarberServicesAction`, `getAdminSlotsAction` e as regras atuais de transição de status.
- Usar intervalos configurados em `barbershop_settings`, com fallback de 30 minutos.
- Não implementar semana, mês, drag-and-drop, redimensionamento ou edição financeira.
- Não permitir criação em almoço, folga, bloqueio ou fora do expediente.
- Preservar adicionais, produtos, totais e observações na sidebar de detalhes.
- Manter rolagem horizontal e sidebar quase integral no celular.

---

### Task 1: Modelo e funções puras da grade

**Files:**
- Create: `src/app/dashboard/agenda/agenda-grid-utils.ts`
- Modify: `src/app/dashboard/agenda/agenda-types.ts`
- Test: `tests/unit/agenda-grid-utils.test.ts`

**Interfaces:**
- Produces: `generateAgendaSlots(startTime: string, endTime: string, intervalMinutes: number): string[]`
- Produces: `getAgendaCellState(input: AgendaCellInput): AgendaCellState`
- Produces: `getAppointmentSpan(startAt: string, endAt: string, intervalMinutes: number): number`
- Produces: `AgendaSettings`, `AgendaWorkHour`, `AgendaBlock`, `AgendaCellState`

- [ ] **Step 1: Escrever testes falhando para intervalos, duração e estados**

```ts
expect(generateAgendaSlots('09:00:00', '10:30:00', 30)).toEqual([
  '09:00',
  '09:30',
  '10:00',
])
expect(getAppointmentSpan('2030-07-22T09:00:00.000Z', '2030-07-22T10:00:00.000Z', 30)).toBe(2)
expect(getAgendaCellState(workingLunchInput)).toBe('lunch')
expect(getAgendaCellState(blockedInput)).toBe('blocked')
expect(getAgendaCellState(offShiftInput)).toBe('off')
expect(getAgendaCellState(availableInput)).toBe('available')
```

- [ ] **Step 2: Executar o teste e confirmar falha por módulo inexistente**

Run: `npm test -- tests/unit/agenda-grid-utils.test.ts`
Expected: FAIL porque `agenda-grid-utils` ainda não existe.

- [ ] **Step 3: Implementar tipos e funções puras mínimas**

```ts
export type AgendaCellState = 'available' | 'lunch' | 'blocked' | 'off'

export function generateAgendaSlots(startTime: string, endTime: string, intervalMinutes: number) {
  // Converte HH:mm para minutos, avança pelo intervalo e não inclui endTime.
}

export function getAppointmentSpan(startAt: string, endAt: string, intervalMinutes: number) {
  return Math.max(1, Math.ceil((Date.parse(endAt) - Date.parse(startAt)) / 60000 / intervalMinutes))
}
```

- [ ] **Step 4: Executar o teste e confirmar aprovação**

Run: `npm test -- tests/unit/agenda-grid-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/agenda/agenda-grid-utils.ts src/app/dashboard/agenda/agenda-types.ts tests/unit/agenda-grid-utils.test.ts
git commit -m "feat: add daily agenda grid rules"
```

### Task 2: Carregamento do expediente e bloqueios

**Files:**
- Modify: `src/app/dashboard/agenda/actions.ts`
- Modify: `src/app/dashboard/agenda/page.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: `AgendaSettings`, `AgendaWorkHour`, `AgendaBlock`
- Produces: `getAgendaAppointments(dateStr)` com `{ barbers, appointments, settings, workHours, blocks }`

- [ ] **Step 1: Escrever teste falhando para as consultas necessárias**

```ts
expect(actions).toContain(".from('barbershop_settings')")
expect(actions).toContain(".from('barber_work_hours')")
expect(actions).toContain(".from('barber_blocked_times')")
expect(page).toContain('initialSettings={data.settings}')
expect(page).toContain('initialWorkHours={data.workHours}')
expect(page).toContain('initialBlocks={data.blocks}')
```

- [ ] **Step 2: Executar o teste e confirmar falha nas consultas ausentes**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`
Expected: FAIL nas novas expectativas.

- [ ] **Step 3: Ampliar a carga paralela e mapear dados serializáveis**

```ts
const dayOfWeek = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay()
// Consultar settings por tenant, work hours ativos do dayOfWeek e blocks que
// sobreponham o início/fim UTC do dia. Mapear snake_case para os tipos da Agenda.
```

- [ ] **Step 4: Passar os novos dados da página para `AgendaClient`**

```tsx
<AgendaClient
  initialBarbers={data.barbers}
  initialAppointments={data.appointments}
  initialSettings={data.settings}
  initialWorkHours={data.workHours}
  initialBlocks={data.blocks}
  currentDate={targetDate}
/>
```

- [ ] **Step 5: Executar testes relacionados**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts tests/unit/agenda-grid-utils.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/agenda/actions.ts src/app/dashboard/agenda/page.tsx tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: load daily agenda availability"
```

### Task 3: Grade visual e navegação diária

**Files:**
- Create: `src/app/dashboard/agenda/agenda-grid.tsx`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: barbeiros, reservas, settings, work hours, blocks e callbacks `onSelectSlot(barberId, time)` / `onSelectAppointment(appointment)`
- Produces: cabeçalho diário e grade acessível com estados visuais

- [ ] **Step 1: Escrever contrato falhando para a grade**

```ts
expect(client).toContain('AgendaGrid')
expect(grid).toContain('aria-label={`Agendar com ${barber.name} às ${time}`}')
expect(grid).toContain('onSelectSlot(barber.id, time)')
expect(grid).toContain('getAppointmentSpan')
expect(grid).toContain('overflow-x-auto')
```

- [ ] **Step 2: Executar o teste e confirmar falha por componente ausente**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`
Expected: FAIL nas expectativas da grade.

- [ ] **Step 3: Implementar cabeçalho, navegação e grade**

```tsx
<AgendaGrid
  appointments={initialAppointments}
  barbers={initialBarbers}
  blocks={initialBlocks}
  settings={initialSettings}
  workHours={initialWorkHours}
  onSelectAppointment={setSelectedAppointment}
  onSelectSlot={openCreateForSlot}
/>
```

Os cartões devem mostrar cliente, serviço, intervalo, valor e status. Horários indisponíveis devem ser elementos não clicáveis; células livres devem ser botões.

- [ ] **Step 4: Executar os testes relacionados**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts tests/unit/agenda-grid-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/agenda/agenda-grid.tsx src/app/dashboard/agenda/agenda-client.tsx tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: restore daily barber agenda grid"
```

### Task 4: Sidebar de criação contextual

**Files:**
- Create: `src/app/dashboard/agenda/manual-booking-sheet.tsx`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: seleção opcional `{ barberId: string; time: string }`, barbeiros, data e ações atuais
- Produces: `ManualBookingSheet` com `open`, `onClose` e `onCreated`

- [ ] **Step 1: Escrever contrato falhando para pré-preenchimento editável**

```ts
expect(client).toContain('openCreateForSlot')
expect(client).toContain('setCreateSelection({ barberId, time })')
expect(sheet).toContain('value={selectedBarberId}')
expect(sheet).toContain('value={selectedTime}')
expect(sheet).toContain('getAdminBarberServicesAction')
expect(sheet).toContain('getAdminSlotsAction')
expect(sheet).toContain('createAdminAppointment')
```

- [ ] **Step 2: Executar o teste e confirmar falha pelo arquivo ausente**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`
Expected: FAIL nas expectativas da sidebar.

- [ ] **Step 3: Extrair o formulário e abrir com contexto**

```tsx
<ManualBookingSheet
  barbers={initialBarbers}
  currentDate={currentDate}
  initialSelection={createSelection}
  onClose={closeCreate}
  onCreated={() => {
    closeCreate()
    router.refresh()
  }}
  open={isCreateOpen}
/>
```

Ao receber uma seleção, carregar os serviços do barbeiro imediatamente; após a escolha do serviço, carregar horários e manter o horário clicado somente se continuar disponível.

- [ ] **Step 4: Tratar recarga e conflito sem perder dados**

```ts
if (result.code === 'CONFIG_CHANGED' || result.code === 'INVALID_BARBER_SERVICE') {
  await loadServices(selectedBarberId)
}
if (result.code === 'SLOT_UNAVAILABLE') {
  await loadSlots(selectedServiceId)
}
```

- [ ] **Step 5: Executar os testes relacionados**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts tests/unit/agenda-grid-utils.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/agenda/manual-booking-sheet.tsx src/app/dashboard/agenda/agenda-client.tsx tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: add contextual manual booking sheet"
```

### Task 5: Sidebar de detalhes e acabamento responsivo

**Files:**
- Create: `src/app/dashboard/agenda/appointment-details-sheet.tsx`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: `AppointmentDetails`, `isPending`, `onChangeStatus`
- Produces: detalhes financeiros preservados e `Sheet` com largura responsiva configurável

- [ ] **Step 1: Escrever contrato falhando para detalhes e responsividade**

```ts
expect(details).toContain('Preço do serviço')
expect(details).toContain('Adicionais')
expect(details).toContain('Subtotal dos produtos')
expect(details).toContain('Total na barbearia')
expect(details).toContain('getAllowedAppointmentTransitions')
expect(sheet).toContain('panelClassName')
```

- [ ] **Step 2: Executar o teste e confirmar falha pelo componente ausente**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`
Expected: FAIL nas novas expectativas.

- [ ] **Step 3: Extrair os detalhes e ampliar `Sheet` sem quebrar consumidores**

```ts
interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  panelClassName?: string
}
```

Usar `panelClassName="max-w-[480px]"` nas sidebars da Agenda, mantendo largura total no celular.

- [ ] **Step 4: Executar testes, lint e checagem de tipos via build**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts tests/unit/agenda-grid-utils.test.ts`
Expected: PASS.

Run: `npm run lint -- src/app/dashboard/agenda src/components/ui/sheet.tsx tests/unit/agenda-grid-utils.test.ts`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/agenda src/components/ui/sheet.tsx tests/unit
git commit -m "refactor: polish agenda side sheets"
```

### Task 6: Validação visual e interativa

**Files:**
- Modify if needed: `src/app/dashboard/agenda/*.tsx`
- Test: `tests/e2e/agenda-grid.spec.ts`

**Interfaces:**
- Consumes: Agenda implementada e ambiente local autenticado disponível
- Produces: evidência de desktop e mobile e teste de navegação/interação

- [ ] **Step 1: Escrever cenário E2E para a grade**

```ts
test('opens a contextual manual booking sheet from an available cell', async ({ page }) => {
  await page.goto('/dashboard/agenda?date=2030-07-22')
  await page.getByRole('button', { name: /Agendar com .* às/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Nova reserva manual' })).toBeVisible()
})
```

- [ ] **Step 2: Executar o cenário e confirmar a falha inicial apropriada**

Run: `npm run test:e2e -- tests/e2e/agenda-grid.spec.ts`
Expected: FAIL se o ambiente/fixture ainda não expuser a Agenda autenticada; registrar a limitação e validar o fluxo com o navegador disponível.

- [ ] **Step 3: Executar a aplicação e inspecionar desktop e mobile**

Run: `npm run dev`
Expected: servidor local disponível. Conferir a data, cabeçalhos, rolagem, estados das células, sidebars, foco e ausência de overflow da página.

- [ ] **Step 4: Corrigir somente divergências observadas e repetir verificações**

Run: `npm test`
Expected: todos os testes unitários passam.

Run: `npm run lint`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit final de validação**

```bash
git add src/app/dashboard/agenda tests/e2e/agenda-grid.spec.ts
git commit -m "test: verify daily agenda workflow"
```
