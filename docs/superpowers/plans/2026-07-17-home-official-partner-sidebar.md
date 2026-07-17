# Home Official Partner and Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir a Hoffmann's Barber como parceira oficial no final da home, posicionar Financeiro logo abaixo de Agenda e ocultar Admin Master da sidebar.

**Architecture:** A mudança permanece nos dois componentes existentes: a home Server Component compõe uma nova faixa estática usando `next/image`, enquanto a sidebar altera somente seu array declarativo de navegação. Um teste de contrato de UI protege o asset, o texto e a ordem dos itens sem introduzir nova lógica de cliente.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Vitest 4.

## Global Constraints

- Usar a logo fornecida pelo usuário sem redesenhá-la.
- Renderizar a parceria em uma faixa clara ao final da home.
- Exibir o rótulo exato `Parceiro Oficial`.
- Posicionar `Financeiro` imediatamente após `Agenda`.
- Remover `Admin Master` apenas da sidebar, preservando a rota existente.
- Seguir a documentação local de Next.js 16.2.6 para imagens no App Router.

---

### Task 1: Contrato da faixa e da navegação

**Files:**
- Create: `tests/unit/home-partner-sidebar.test.ts`
- Modify: `src/components/dashboard/sidebar.tsx:10-22`
- Modify: `src/app/dashboard/page.tsx:1-290`
- Create: `public/brand/partners/hoffmanns-barber.png`

**Interfaces:**
- Consumes: arquivo PNG fornecido pelo usuário.
- Produces: asset público `/brand/partners/hoffmanns-barber.png`, faixa acessível com `aria-label="Parceiro Oficial"` e nova ordem de `sidebarItems`.

- [ ] **Step 1: Ler a documentação local relevante do Next.js**

Run: `Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`

Expected: documentação confirma importação de `Image` de `next/image`, uso de `width`, `height` e `alt` para assets em `public`.

- [ ] **Step 2: Escrever o teste de contrato inicialmente falho**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('home partner banner and sidebar navigation', () => {
  it('shows the official partner banner with the provided logo', () => {
    const home = source('src/app/dashboard/page.tsx')

    expect(home).toContain("import Image from 'next/image'")
    expect(home).toContain('aria-label="Parceiro Oficial"')
    expect(home).toContain('Parceiro Oficial')
    expect(home).toContain('/brand/partners/hoffmanns-barber.png')
  })

  it('places Financeiro after Agenda and removes Admin Master from the sidebar', () => {
    const sidebar = source('src/components/dashboard/sidebar.tsx')
    const agendaIndex = sidebar.indexOf("name: 'Agenda'")
    const financeiroIndex = sidebar.indexOf("name: 'Financeiro'")
    const reservasIndex = sidebar.indexOf("name: 'Reservas'")

    expect(agendaIndex).toBeGreaterThan(-1)
    expect(financeiroIndex).toBeGreaterThan(agendaIndex)
    expect(financeiroIndex).toBeLessThan(reservasIndex)
    expect(sidebar).not.toContain("name: 'Admin Master'")
  })
})
```

- [ ] **Step 3: Rodar o teste e confirmar a falha esperada**

Run: `npm test -- tests/unit/home-partner-sidebar.test.ts`

Expected: FAIL porque a home ainda não importa `next/image`, não contém a faixa e a sidebar ainda mantém a ordem antiga e `Admin Master`.

- [ ] **Step 4: Copiar o asset e implementar a mudança mínima**

Copiar a imagem fornecida para `public/brand/partners/hoffmanns-barber.png`.

Adicionar à home:

```tsx
import Image from 'next/image'
```

Substituir o rodapé decorativo por:

```tsx
<section
  aria-label="Parceiro Oficial"
  className="rounded-2xl border border-[#c8c5cb]/30 bg-white px-6 py-8 text-center shadow-xs sm:px-10"
>
  <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#C79A4A]">
    Parceiro Oficial
  </p>
  <Image
    src="/brand/partners/hoffmanns-barber.png"
    alt="Hoffmann's Barber, parceiro oficial da HeadBarber"
    width={2048}
    height={1152}
    className="mx-auto h-auto w-full max-w-[360px] object-contain"
  />
</section>
```

Na sidebar, ordenar o começo do array assim e remover a entrada de Admin Master:

```ts
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { name: 'Agenda', href: '/dashboard/agenda', icon: 'calendar_today' },
  { name: 'Financeiro', href: '/dashboard/financeiro', icon: 'payments' },
  { name: 'Reservas', href: '/dashboard/reservas', icon: 'book_online' },
```

- [ ] **Step 5: Rodar o teste e confirmar sucesso**

Run: `npm test -- tests/unit/home-partner-sidebar.test.ts`

Expected: PASS, 2 tests passing.

- [ ] **Step 6: Rodar verificações completas**

Run: `npm test`

Expected: todos os testes passam.

Run: `npm run lint`

Expected: exit code 0, sem erros.

Run: `npm run build`

Expected: exit code 0 e build do Next.js concluído.

- [ ] **Step 7: Verificar visualmente desktop e mobile**

Abrir `/dashboard`, confirmar que a faixa aparece ao final da home, que a logo preserva sua proporção e que a sidebar tem a ordem `Dashboard`, `Agenda`, `Financeiro`, `Reservas`, sem `Admin Master`. Repetir no drawer móvel e confirmar ausência de overflow horizontal.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/plans/2026-07-17-home-official-partner-sidebar.md tests/unit/home-partner-sidebar.test.ts public/brand/partners/hoffmanns-barber.png src/app/dashboard/page.tsx src/components/dashboard/sidebar.tsx
git commit -m "feat: add official partner banner"
```
