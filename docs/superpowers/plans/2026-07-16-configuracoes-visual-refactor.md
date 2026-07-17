# Configurações Visual Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar visualmente o conteúdo da tela de Configurações para reproduzir os protótipos de Agenda/Horários e Bloqueios Excepcionais sem alterar o comportamento existente.

**Architecture:** Manter `page.tsx` como Server Component responsável por carregar configurações e barbeiros, e manter `ConfiguracoesClient` como a única fronteira interativa. A implementação reorganiza somente o JSX e as classes Tailwind do componente cliente; um teste de contrato baseado no source protege a semântica das abas, a nova anatomia visual e as quatro chamadas de actions existentes.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Lucide React, Vitest 4 e Playwright 1.60.

## Global Constraints

- Preservar integralmente a sidebar, o cabeçalho e o `DashboardShell` atuais.
- Não modificar `src/app/dashboard/configuracoes/page.tsx` nem `src/app/dashboard/configuracoes/actions.ts`.
- Não adicionar dependências, novas consultas, novas actions ou uma segunda fonte de estado.
- Preservar busca filtrada por barbeiro, criação, exclusão, validações, conversão ISO, mensagens e estados de carregamento existentes.
- Usar fundo off-white, superfícies brancas, grafite e dourado `#C79A4A`, com Montserrat nos títulos e Inter nos demais textos.
- Usar Tailwind no componente; não alterar CSS global para uma necessidade local.
- Garantir layout sem rolagem horizontal em desktop e mobile.

---

## File Map

- Create `tests/unit/configuracoes-ui.test.ts`: contrato estático da anatomia, acessibilidade e preservação das actions da tela.
- Modify `src/app/dashboard/configuracoes/configuracoes-client.tsx`: único arquivo de produção alterado; mantém estado e handlers, substitui imports sem uso e refatora o retorno visual.
- Reference only `src/app/dashboard/configuracoes/page.tsx`: confirma a fronteira Server/Client; não editar.
- Reference only `src/app/dashboard/configuracoes/actions.ts`: confirma assinaturas existentes; não editar.
- Reference only `src/components/dashboard/dashboard-shell.tsx`: confirma que a sidebar e o shell já fornecem o canvas claro; não editar.

### Task 1: Proteger o contrato funcional e visual da tela

**Files:**
- Create: `tests/unit/configuracoes-ui.test.ts`
- Test: `tests/unit/configuracoes-ui.test.ts`

**Interfaces:**
- Consumes: arquivo `src/app/dashboard/configuracoes/configuracoes-client.tsx` como texto UTF-8.
- Produces: testes que exigem as labels finais, semântica de tabs e invocações de `updateBarbershopSettingsAction`, `getBarberBlocks`, `createBarberBlock` e `deleteBarberBlock`.

- [ ] **Step 1: Escrever o teste de contrato que falha com a UI atual**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentPath = resolve(
  process.cwd(),
  'src/app/dashboard/configuracoes/configuracoes-client.tsx',
)
const source = readFileSync(componentPath, 'utf8')

describe('configurações visual contract', () => {
  it('exposes the approved page hierarchy and semantic tabs', () => {
    expect(source).toContain('>Configurações</h1>')
    expect(source).toContain('Agenda & Horários')
    expect(source).toContain('Bloqueios Excepcionais')
    expect(source).toContain('role="tablist"')
    expect(source).toContain('role="tab"')
    expect(source).toContain('aria-selected={activeTab === \'agenda\'}')
    expect(source).toContain('aria-selected={activeTab === \'blocked\'}')
    expect(source).toContain('Regras de Agendamento')
    expect(source).toContain('Horários de Funcionamento')
    expect(source).toContain('Novo Bloqueio')
    expect(source).toContain('Bloqueios Ativos')
  })

  it('preserves the existing settings and exceptional-block actions', () => {
    expect(source).toContain('await updateBarbershopSettingsAction({')
    expect(source).toContain('const blocks = await getBarberBlocks(barberId)')
    expect(source).toContain(
      'await createBarberBlock(selectedBarberBlock, startIso, endIso, blockReason)',
    )
    expect(source).toContain('await deleteBarberBlock(blockId)')
  })

  it('uses the approved light surface instead of the old dark cards', () => {
    expect(source).not.toContain('bg-neutral-900')
    expect(source).not.toContain('bg-neutral-950')
    expect(source).not.toContain('text-white')
    expect(source).toContain('bg-white')
    expect(source).toContain('bg-[#f8f9ff]')
    expect(source).toContain('border-[#e0e2e9]')
    expect(source).toContain('text-[#C79A4A]')
  })
})
```

- [ ] **Step 2: Executar o teste e confirmar a falha esperada**

Run: `npm test -- tests/unit/configuracoes-ui.test.ts`

Expected: FAIL no primeiro teste porque a tela atual ainda usa `Configurações do Sistema`, `Agenda & Slots` e não possui `role="tablist"`.

- [ ] **Step 3: Commitar somente o teste vermelho**

```bash
git add tests/unit/configuracoes-ui.test.ts
git commit -m "test: define configuracoes visual contract"
```

### Task 2: Implementar a nova anatomia visual preservando os handlers

**Files:**
- Modify: `src/app/dashboard/configuracoes/configuracoes-client.tsx:3-15`
- Modify: `src/app/dashboard/configuracoes/configuracoes-client.tsx:169-479`
- Test: `tests/unit/configuracoes-ui.test.ts`

**Interfaces:**
- Consumes: props `initialSettings` e `barbers`; handlers `handleSaveSettings`, `handleAddBlock`, `handleDeleteBlock`; estados atuais de forms, feedback e transições.
- Produces: a mesma exportação `ConfiguracoesClient({ initialSettings, barbers }: SettingsClientProps)` e o mesmo comportamento, com nova apresentação responsiva.

- [ ] **Step 1: Limpar imports e definir os tokens locais de controles**

Substituir os imports Lucide e remover `Input` e `Badge`, que deixam de ser necessários:

```tsx
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  ListChecks,
  LoaderCircle,
  PlusCircle,
  Save,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
```

Adicionar imediatamente antes de `ConfiguracoesClient`:

```tsx
const fieldLabelClassName =
  'block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-[#47464b]'

const controlClassName =
  'h-12 w-full rounded-lg border border-[#c8c5cb] bg-[#f8f9ff] px-4 font-inter text-sm text-[#181c21] outline-none transition-colors focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/15 disabled:cursor-not-allowed disabled:opacity-60'

const cardClassName =
  'rounded-xl border border-[#e0e2e9] bg-white shadow-[0_4px_12px_rgba(26,26,29,0.04)]'
```

- [ ] **Step 2: Substituir o cabeçalho e as tabs escuras por navegação sublinhada**

O contêiner raiz deve ocupar o canvas claro do shell, com o seguinte cabeçalho e tabs:

```tsx
<div className="min-h-[calc(100vh-4rem)] bg-[#f8f9ff] px-4 py-6 sm:px-6 lg:px-8">
  <div className="mx-auto w-full max-w-[1180px]">
    <header className="mb-7">
      <h1 className="font-montserrat text-2xl font-bold tracking-[-0.02em] text-[#181c21] sm:text-[32px]">
        Configurações
      </h1>
      <p className="mt-2 max-w-2xl font-inter text-sm leading-6 text-[#47464b] sm:text-base">
        Defina regras de agenda, horários e bloqueios da barbearia.
      </p>
    </header>

    <div
      role="tablist"
      aria-label="Seções das configurações"
      className="mb-8 flex gap-7 overflow-x-auto border-b border-[#e0e2e9]"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'agenda'}
        onClick={() => {
          setActiveTab('agenda')
          setErrorMsg('')
          setSuccessMsg('')
        }}
        className={`relative shrink-0 px-0.5 pb-3 font-inter text-sm font-semibold transition-colors ${
          activeTab === 'agenda'
            ? 'text-[#181c21] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-[#C79A4A]'
            : 'text-[#77767b] hover:text-[#181c21]'
        }`}
      >
        Agenda & Horários
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'blocked'}
        onClick={() => {
          setActiveTab('blocked')
          setErrorMsg('')
          setSuccessMsg('')
        }}
        className={`relative shrink-0 px-0.5 pb-3 font-inter text-sm font-semibold transition-colors ${
          activeTab === 'blocked'
            ? 'text-[#181c21] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-[#C79A4A]'
            : 'text-[#77767b] hover:text-[#181c21]'
        }`}
      >
        Bloqueios Excepcionais
      </button>
    </div>
```

Fechar os dois contêineres no fim do retorno. Não alterar os callbacks das tabs.

- [ ] **Step 3: Reestilizar feedbacks com semântica de status**

```tsx
{successMsg && (
  <div role="status" className="mb-6 flex max-w-2xl items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 font-inter text-sm font-semibold text-emerald-800">
    <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
    <span>{successMsg}</span>
  </div>
)}

{errorMsg && (
  <div role="alert" className="mb-6 flex max-w-2xl items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-inter text-sm font-semibold text-red-800">
    <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
    <span>{errorMsg}</span>
  </div>
)}
```

- [ ] **Step 4: Montar Agenda em dois cartões claros e uma action bar**

Usar um único `<form onSubmit={handleSaveSettings}>` envolvendo grid e rodapé. O grid deve ser `grid-cols-1 lg:grid-cols-2`; o primeiro cartão recebe `ListChecks` e o segundo `Clock3`. Aplicar:

```tsx
<form onSubmit={handleSaveSettings} className="space-y-6">
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <section className={cardClassName} aria-labelledby="scheduling-rules-title">
      <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3fa] text-[#181c21]">
          <ListChecks className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="scheduling-rules-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">
          Regras de Agendamento
        </h2>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        {/* Manter os dois selects controlados existentes. */}
      </div>
    </section>

    <section className={cardClassName} aria-labelledby="business-hours-title">
      <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f3fa] text-[#181c21]">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="business-hours-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">
          Horários de Funcionamento
        </h2>
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        {/* Manter os quatro inputs time controlados existentes. */}
      </div>
    </section>
  </div>

  <div className="flex justify-end border-t border-[#e0e2e9] pt-6">
    <Button type="submit" disabled={isSaving} className="h-12 gap-2 rounded-lg px-6 font-inter text-sm">
      {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
      {isSaving ? 'Salvando...' : 'Salvar configurações'}
    </Button>
  </div>
</form>
```

Nos dois selects, manter os `value`, `onChange` e `<option>` atuais, aplicar `controlClassName`, `appearance-none pr-10` e envolver com `relative`; adicionar `ChevronDown` absoluto à direita. Nos inputs time, manter exatamente os quatro `value` e `onChange`, aplicar `controlClassName` e usar grids `grid-cols-1 sm:grid-cols-2`. Labels usam `fieldLabelClassName`; textos auxiliares usam `mt-2 font-inter text-xs leading-5 text-[#77767b]`.

- [ ] **Step 5: Montar Bloqueios com formulário 5/12 e lista 7/12**

Aplicar a seguinte composição, mantendo cada campo controlado e cada ramo condicional existente:

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
  <section className={`${cardClassName} h-fit lg:col-span-5`} aria-labelledby="new-block-title">
    <div className="flex items-center gap-3 border-b border-[#eceef4] px-5 py-5 sm:px-6">
      <PlusCircle className="h-5 w-5 text-[#C79A4A]" aria-hidden="true" />
      <h2 id="new-block-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">
        Novo Bloqueio
      </h2>
    </div>
    <form onSubmit={handleAddBlock} className="space-y-5 p-5 sm:p-6">
      {/* Manter select, datetime-local inicial/final, textarea e handlers atuais. */}
      <Button type="submit" disabled={isBlocking} className="h-12 w-full gap-2 rounded-lg font-inter text-sm">
        {isBlocking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarClock className="h-4 w-4" aria-hidden="true" />}
        {isBlocking ? 'Registrando bloqueio...' : 'Registrar bloqueio'}
      </Button>
    </form>
  </section>

  <section className={`${cardClassName} min-h-[420px] lg:col-span-7`} aria-labelledby="active-blocks-title">
    <div className="flex items-center justify-between gap-4 border-b border-[#eceef4] px-5 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-[#77767b]" aria-hidden="true" />
        <h2 id="active-blocks-title" className="font-montserrat text-lg font-semibold text-[#181c21] sm:text-xl">
          Bloqueios Ativos
        </h2>
      </div>
      {selectedBarberBlock && !isLoadingBlocks && (
        <span className="rounded-full border border-[#e0e2e9] bg-[#eceef4] px-3 py-1 font-inter text-[11px] font-semibold text-[#47464b]">
          {activeBlocks.length} {activeBlocks.length === 1 ? 'bloqueio' : 'bloqueios'}
        </span>
      )}
    </div>
    <div className="p-5 sm:p-6">
      {/* Manter os quatro ramos: sem barbeiro, loading, vazio e lista. */}
    </div>
  </section>
</div>
```

Aplicar `controlClassName` aos campos. No select, manter `barbers.map`. Nos `datetime-local`, manter `blockStart`, `blockEnd` e seus setters. No textarea, manter `blockReason`, `setBlockReason`, `rows={3}` e o placeholder existente.

Nos estados sem barbeiro e vazio, usar `min-h-[280px] flex flex-col items-center justify-center text-center` com ícone `CalendarDays`, título grafite e descrição cinza. No loading, usar `LoaderCircle` dourado e `Consultando bloqueios...`.

Cada item deve manter `key={block.id}`, `block.reason`, `formatDateTime(block.start_at)`, `formatDateTime(block.end_at)` e `onClick={() => handleDeleteBlock(block.id)}`. Usar `rounded-lg border border-[#e0e2e9] bg-[#f8f9ff] p-4`, ícone `CalendarClock`, badge estático `Bloqueado` e botão ghost com `aria-label="Excluir bloqueio"`, `Trash2` e estados hover/focus vermelhos.

- [ ] **Step 6: Executar contrato, lint e build**

Run: `npm test -- tests/unit/configuracoes-ui.test.ts`

Expected: PASS com 3 testes.

Run: `npm run lint -- src/app/dashboard/configuracoes/configuracoes-client.tsx tests/unit/configuracoes-ui.test.ts`

Expected: exit 0, sem imports sem uso, `any` novo ou JSX inválido. Avisos preexistentes fora dos arquivos em escopo não contam como falha desta tarefa.

Run: `npm run build`

Expected: exit 0 e rota `/dashboard/configuracoes` compilada com sucesso.

- [ ] **Step 7: Commitar a refatoração funcionalmente neutra**

```bash
git add src/app/dashboard/configuracoes/configuracoes-client.tsx tests/unit/configuracoes-ui.test.ts
git commit -m "feat: redesign configuracoes screen"
```

### Task 3: Validar fidelidade visual e responsividade no navegador

**Files:**
- Modify if needed: `src/app/dashboard/configuracoes/configuracoes-client.tsx`
- Reference: os dois arquivos HTML anexados pelo usuário.
- Test: renderização da rota `/dashboard/configuracoes` em navegador real.

**Interfaces:**
- Consumes: implementação concluída da Task 2 e sessão autenticada do dashboard.
- Produces: screenshots temporários de QA e uma tela validada nos dois estados de aba e em dois tamanhos de viewport.

- [ ] **Step 1: Iniciar a aplicação e abrir a rota no Browser/IAB**

Run: `npm run dev`

Expected: servidor disponível em `http://localhost:3000`.

Abrir `/dashboard/configuracoes` usando o Browser/IAB. Se a sessão não estiver autenticada, usar o fluxo de login já existente do projeto; não alterar autenticação nem criar bypass.

- [ ] **Step 2: Validar a aba Agenda & Horários em desktop**

Usar viewport de `1440x1000` e verificar:

- sidebar atual intacta;
- título, descrição e tabs alinhados ao grid do dashboard;
- dois cartões lado a lado, sem nested cards;
- labels e controles legíveis, com 48 px de altura;
- dourado limitado à tab ativa, foco, ícones-chave e botão primário;
- action bar separada e alinhada à direita;
- ausência de clipping ou overflow horizontal.

Capturar screenshot temporário e inspecioná-lo com `view_image`.

- [ ] **Step 3: Validar a aba Bloqueios Excepcionais em desktop**

Clicar na tab `Bloqueios Excepcionais` e verificar:

- formulário menor à esquerda e lista maior à direita;
- select do barbeiro continua acionando loading e lista filtrada;
- estados sem seleção, carregando e vazio ocupam o painel sem saltos de layout;
- item de bloqueio mantém motivo, intervalo, badge e exclusão;
- controles de criação e exclusão mantêm feedback visual.

Capturar screenshot temporário e inspecioná-lo com `view_image`.

- [ ] **Step 4: Validar mobile**

Usar viewport de `390x844` e verificar as duas tabs:

- o drawer/sidebar mobile do shell continua intacto;
- tabs podem rolar horizontalmente sem cortar o texto;
- cartões e painéis são empilhados;
- campos de data/hora não extrapolam a largura;
- botões têm largura e altura adequadas;
- nenhum elemento produz scroll horizontal.

- [ ] **Step 5: Comparar referência e implementação**

Renderizar os HTMLs anexados em screenshots temporários quando o ambiente conseguir carregar suas dependências; caso as dependências externas dos protótipos não carreguem, usar o HTML e o design system como evidência estrutural. Inspecionar com `view_image` as referências renderizadas e as screenshots finais da implementação.

Registrar uma fidelity ledger com pelo menos estes pontos: hierarquia/copy, anatomia dos grids, tipografia, paleta, bordas/radii/sombras, controles, estados vazios e responsividade. Corrigir qualquer discrepância material antes de concluir.

- [ ] **Step 6: Reexecutar a verificação após ajustes visuais**

Run: `npm test -- tests/unit/configuracoes-ui.test.ts`

Expected: PASS com 3 testes.

Run: `npm run lint -- src/app/dashboard/configuracoes/configuracoes-client.tsx tests/unit/configuracoes-ui.test.ts`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 7: Commitar eventuais ajustes finais de fidelidade**

Se a Task 3 alterou o componente:

```bash
git add src/app/dashboard/configuracoes/configuracoes-client.tsx
git commit -m "fix: polish configuracoes visual fidelity"
```

Se não houve alteração, não criar commit vazio.
