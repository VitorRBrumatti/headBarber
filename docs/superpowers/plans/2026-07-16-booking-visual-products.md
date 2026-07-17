# Booking Visual Refactor and Product Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o agendamento público para o visual grafite/dourado aprovado, preservar o fluxo existente e adicionar uma sétima etapa opcional de produtos com consulta e reserva atômica de estoque.

**Architecture:** A página continua como Server Component que carrega dados serializáveis do Supabase e os entrega a um wizard Client Component. A lógica visual será dividida em componentes focados e cálculos puros testáveis. Uma nova RPC envolverá a RPC atual de agendamento na mesma transação Postgres, reservará produtos com bloqueio de linha e manterá o cancelamento idempotente por trigger.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Supabase/Postgres, Vitest 4, Playwright 1.60, lucide-react.

## Global Constraints

- Fluxo exato: Serviço → Profissional → Adicionais → Produtos → Data e hora → Dados pessoais → Confirmação.
- Produtos são opcionais e podem ser pulados.
- Pagamento e retirada acontecem na barbearia; não existe pagamento online.
- Fundo `#1A1A1D`, dourado `#C79A4A`, texto branco/cinza, Montserrat em títulos e Inter em UI.
- Estoque zero deve aparecer desabilitado já na listagem.
- A confirmação precisa revalidar e reservar estoque atomicamente.
- Cancelamento devolve estoque uma única vez.
- Produtos reservados não entram como venda paga nem receita antecipada.
- Não adicionar dependências de produção.
- Seguir os guias locais do Next.js 16 em `node_modules/next/dist/docs/01-app/` antes de alterar componentes.
- Para objetos públicos do Supabase, usar grants explícitos, RLS e privilégios mínimos; funções públicas devem revogar `EXECUTE` de `PUBLIC`.

---

## File Map

- Create via CLI: `supabase/migrations/<generated>_booking_products_reservation.sql` — tabela de vínculo, RLS, RPC transacional, trigger de cancelamento e grants.
- Create: `tests/unit/booking-products-migration.test.ts` — contrato estático da migração e das garantias de segurança/concorrência.
- Create: `src/app/booking/[slug]/booking-types.ts` — tipos serializáveis compartilhados pelo fluxo.
- Create: `src/app/booking/[slug]/booking-utils.ts` — quantidades, subtotais e formatação de produtos.
- Create: `tests/unit/booking-utils.test.ts` — testes puros de quantidades e totais.
- Create: `src/app/booking/[slug]/booking-progress.tsx` — progresso desktop/mobile de sete etapas.
- Create: `src/app/booking/[slug]/booking-product-step.tsx` — listagem e seletor acessível de produtos.
- Create: `src/app/booking/[slug]/booking-summary-bar.tsx` — barra fixa de totais e navegação.
- Create: `src/app/booking/[slug]/booking-success.tsx` — sucesso e resumo final.
- Modify: `src/app/booking/[slug]/actions.ts` — carregar produtos, aceitar seleção e mapear conflito de estoque.
- Modify: `src/app/booking/[slug]/page.tsx` — passar produtos ao Client Component e aplicar shell grafite.
- Modify: `src/app/booking/[slug]/booking-client.tsx` — integrar sete etapas e componentes extraídos sem mudar regras existentes.
- Create: `tests/unit/booking-actions-contract.test.ts` — contrato de consulta e payload da ação.
- Create: `tests/unit/booking-ui.test.ts` — contrato visual/semântico do wizard.
- Modify: `src/app/dashboard/reservas/page.tsx` — carregar produtos reservados no detalhe da reserva.
- Modify: `src/app/dashboard/reservas/reservas-client.tsx` — mostrar retirada e subtotal pendente.
- Modify: `src/app/dashboard/agenda/actions.ts` — incluir produtos na consulta usada pelo detalhe da agenda.
- Modify: `src/app/dashboard/agenda/agenda-client.tsx` — mostrar produtos reservados no detalhe da agenda.
- Create: `tests/e2e/booking-products.spec.ts` — percurso público com produto disponível, esgotado e fluxo sem produto.

---

### Task 1: Persistência e reserva atômica de produtos

**Files:**
- Create via CLI: `supabase/migrations/<generated>_booking_products_reservation.sql`
- Create: `tests/unit/booking-products-migration.test.ts`

**Interfaces:**
- Consumes: `public.create_public_appointment_with_client(UUID, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, TEXT, UUID[]) RETURNS UUID`.
- Produces: `public.create_public_appointment_with_products(..., p_products JSONB) RETURNS UUID` e `public.appointment_products`.

- [ ] **Step 1: Escrever o teste de contrato da migração**

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationName = readdirSync(join(process.cwd(), 'supabase', 'migrations'))
  .find((name) => name.endsWith('_booking_products_reservation.sql'))

if (!migrationName) throw new Error('booking products migration not found')

const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', migrationName), 'utf8')

describe('booking product reservations migration', () => {
  it('creates a protected reservation relation', () => {
    expect(sql).toMatch(/create table public\.appointment_products/i)
    expect(sql).toMatch(/enable row level security/i)
    expect(sql).toMatch(/quantity integer not null check \(quantity > 0\)/i)
    expect(sql).toMatch(/status text not null default 'reserved'/i)
    expect(sql).toMatch(/unique \(appointment_id, product_id\)/i)
  })

  it('locks stock and exposes only the intended RPC', () => {
    expect(sql).toMatch(/for update/i)
    expect(sql).toMatch(/create or replace function public\.create_public_appointment_with_products/i)
    expect(sql).toMatch(/revoke execute on function public\.create_public_appointment_with_products[\s\S]+from public/i)
    expect(sql).toMatch(/grant execute on function public\.create_public_appointment_with_products[\s\S]+to anon, authenticated/i)
  })

  it('restores reserved stock once on cancellation', () => {
    expect(sql).toMatch(/old\.status is distinct from 'cancelled'/i)
    expect(sql).toMatch(/new\.status = 'cancelled'/i)
    expect(sql).toMatch(/where appointment_id = new\.id[\s\S]+status = 'reserved'/i)
    expect(sql).toMatch(/set status = 'released'/i)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- tests/unit/booking-products-migration.test.ts`

Expected: FAIL com `booking products migration not found`.

- [ ] **Step 3: Descobrir a CLI e gerar a migração pelo Supabase**

Run: `npx supabase --help`

Expected: lista de comandos da CLI sem erro.

Run: `npx supabase migration new booking_products_reservation`

Expected: criação de `supabase/migrations/<timestamp>_booking_products_reservation.sql`. Usar exatamente o caminho gerado nas etapas seguintes.

- [ ] **Step 4: Implementar tabela, RLS e grants mínimos**

Adicionar ao arquivo gerado:

```sql
create table public.appointment_products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'released')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (appointment_id, product_id)
);

create index appointment_products_barbershop_id_idx on public.appointment_products(barbershop_id);
create index appointment_products_appointment_id_idx on public.appointment_products(appointment_id);
create index appointment_products_product_id_idx on public.appointment_products(product_id);

alter table public.appointment_products enable row level security;

create policy "Appointment products: members can view own barbershop"
on public.appointment_products for select to authenticated
using (barbershop_id = (select barbershop_id from public.profiles where id = (select auth.uid())));

grant select on public.appointment_products to authenticated;
revoke all on public.appointment_products from anon;

drop policy if exists "Products: public can view active" on public.products;
create policy "Products: public can view active"
on public.products for select to anon
using (is_active = true);
grant select on public.products to anon;
```

- [ ] **Step 5: Implementar a RPC wrapper transacional**

Adicionar a função abaixo no mesmo arquivo. Ela chama a RPC atual dentro da mesma transação; qualquer falha de estoque desfaz também o agendamento.

```sql
create or replace function public.create_public_appointment_with_products(
  p_barbershop_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_notes text,
  p_add_on_ids uuid[],
  p_products jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
  v_unavailable jsonb;
begin
  if jsonb_typeof(coalesce(p_products, '[]'::jsonb)) <> 'array' then
    raise exception using message = 'INVALID_PRODUCTS', detail = 'A seleção de produtos deve ser uma lista.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(product_id uuid, quantity integer)
    where item.product_id is null or item.quantity is null or item.quantity <= 0
  ) then
    raise exception using message = 'INVALID_PRODUCTS', detail = 'Produto ou quantidade inválida.';
  end if;

  if exists (
    select item.product_id
    from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(product_id uuid, quantity integer)
    group by item.product_id having count(*) > 1
  ) then
    raise exception using message = 'INVALID_PRODUCTS', detail = 'Produtos duplicados não são permitidos.';
  end if;

  perform product.id
  from public.products as product
  join jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(product_id uuid, quantity integer)
    on item.product_id = product.id
  order by product.id
  for update;

  select jsonb_agg(jsonb_build_object(
    'productId', item.product_id,
    'availableQuantity', coalesce(product.stock_quantity, 0)
  ))
  into v_unavailable
  from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(product_id uuid, quantity integer)
  left join public.products as product
    on product.id = item.product_id
   and product.barbershop_id = p_barbershop_id
   and product.is_active = true
  where product.id is null or product.stock_quantity < item.quantity;

  if v_unavailable is not null then
    raise exception using message = 'INSUFFICIENT_STOCK', detail = v_unavailable::text;
  end if;

  v_appointment_id := public.create_public_appointment_with_client(
    p_barbershop_id, p_client_name, p_client_phone, p_client_email,
    p_barber_id, p_service_id, p_start_at, p_notes, p_add_on_ids
  );

  insert into public.appointment_products (
    barbershop_id, appointment_id, product_id, quantity, unit_price
  )
  select p_barbershop_id, v_appointment_id, product.id, item.quantity, product.sale_price
  from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(product_id uuid, quantity integer)
  join public.products as product on product.id = item.product_id;

  update public.products as product
  set stock_quantity = product.stock_quantity - item.quantity,
      updated_at = timezone('utc', now())
  from jsonb_to_recordset(coalesce(p_products, '[]'::jsonb)) as item(product_id uuid, quantity integer)
  where product.id = item.product_id;

  return v_appointment_id;
end;
$$;

revoke execute on function public.create_public_appointment_with_products(
  uuid, text, text, text, uuid, uuid, timestamptz, text, uuid[], jsonb
) from public;
grant execute on function public.create_public_appointment_with_products(
  uuid, text, text, text, uuid, uuid, timestamptz, text, uuid[], jsonb
) to anon, authenticated;
```

- [ ] **Step 6: Implementar devolução idempotente no cancelamento**

```sql
create schema if not exists private;

create or replace function private.release_cancelled_appointment_products()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.products as product
    set stock_quantity = product.stock_quantity + released.quantity,
        updated_at = timezone('utc', now())
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.appointment_products
      where appointment_id = new.id and status = 'reserved'
      group by product_id
    ) as released
    where product.id = released.product_id;

    update public.appointment_products
    set status = 'released', updated_at = timezone('utc', now())
    where appointment_id = new.id and status = 'reserved';
  end if;
  return new;
end;
$$;

create trigger release_products_on_appointment_cancel
after update of status on public.appointments
for each row execute function private.release_cancelled_appointment_products();

revoke execute on function private.release_cancelled_appointment_products() from public, anon, authenticated;
```

- [ ] **Step 7: Verificar migração e contrato**

Run: `npm test -- tests/unit/booking-products-migration.test.ts`

Expected: PASS, 3 tests.

Run: `npx supabase migration list --local`

Expected: a nova migração aparece no fim da lista local.

Run when local Supabase is available: `npx supabase db reset`

Expected: todas as migrações aplicadas sem erro.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations tests/unit/booking-products-migration.test.ts
git commit -m "feat: reserve booking products atomically"
```

---

### Task 2: Tipos e cálculos puros do agendamento

**Files:**
- Create: `src/app/booking/[slug]/booking-types.ts`
- Create: `src/app/booking/[slug]/booking-utils.ts`
- Create: `tests/unit/booking-utils.test.ts`

**Interfaces:**
- Produces: `BookingProduct`, `SelectedProductQuantities`, `SelectedBookingProduct`, `getProductSubtotal`, `getBookingTotals`, `setProductQuantity`, `toSelectedProducts`.

- [ ] **Step 1: Escrever testes de quantidade e total**

```ts
import { describe, expect, it } from 'vitest'
import { getBookingTotals, setProductQuantity, toSelectedProducts } from '@/app/booking/[slug]/booking-utils'

const product = { id: 'pomade', name: 'Pomada', description: null, category: null, sale_price: 42, stock_quantity: 2, image_url: null }

describe('booking product helpers', () => {
  it('clamps quantity to loaded stock and removes zero', () => {
    expect(setProductQuantity({}, product, 5)).toEqual({ pomade: 2 })
    expect(setProductQuantity({ pomade: 2 }, product, 0)).toEqual({})
  })

  it('builds the RPC payload and totals separately', () => {
    expect(toSelectedProducts({ pomade: 2 })).toEqual([{ productId: 'pomade', quantity: 2 }])
    expect(getBookingTotals(50, [25], [product], { pomade: 2 })).toEqual({
      serviceSubtotal: 75,
      productSubtotal: 84,
      total: 159,
    })
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- tests/unit/booking-utils.test.ts`

Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Criar os tipos compartilhados**

```ts
export interface BookingProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  sale_price: number
  stock_quantity: number
  image_url: string | null
}

export type SelectedProductQuantities = Record<string, number>

export interface SelectedBookingProduct {
  productId: string
  quantity: number
}

export interface UnavailableProduct {
  productId: string
  availableQuantity: number
}
```

- [ ] **Step 4: Implementar helpers mínimos**

```ts
import type { BookingProduct, SelectedBookingProduct, SelectedProductQuantities } from './booking-types'

export function setProductQuantity(
  current: SelectedProductQuantities,
  product: BookingProduct,
  requested: number,
): SelectedProductQuantities {
  const quantity = Math.max(0, Math.min(Math.trunc(requested), product.stock_quantity))
  const next = { ...current }
  if (quantity === 0) delete next[product.id]
  else next[product.id] = quantity
  return next
}

export function toSelectedProducts(selection: SelectedProductQuantities): SelectedBookingProduct[] {
  return Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }))
}

export function getBookingTotals(
  servicePrice: number,
  addOnPrices: number[],
  products: BookingProduct[],
  selection: SelectedProductQuantities,
) {
  const serviceSubtotal = servicePrice + addOnPrices.reduce((sum, price) => sum + price, 0)
  const productSubtotal = products.reduce(
    (sum, product) => sum + product.sale_price * (selection[product.id] ?? 0),
    0,
  )
  return { serviceSubtotal, productSubtotal, total: serviceSubtotal + productSubtotal }
}
```

- [ ] **Step 5: Verificar e commit**

Run: `npm test -- tests/unit/booking-utils.test.ts`

Expected: PASS, 2 tests.

```bash
git add src/app/booking/[slug]/booking-types.ts src/app/booking/[slug]/booking-utils.ts tests/unit/booking-utils.test.ts
git commit -m "test: define booking product calculations"
```

---

### Task 3: Carregamento público e Server Action

**Files:**
- Modify: `src/app/booking/[slug]/actions.ts:10-54,175-336`
- Modify: `src/app/booking/[slug]/page.tsx:1-33`
- Create: `tests/unit/booking-actions-contract.test.ts`

**Interfaces:**
- Consumes: `SelectedBookingProduct`, `UnavailableProduct`.
- Produces: `getBookingPageData(slug).products` e `CreatePublicBookingInput.products?: SelectedBookingProduct[]`.

- [ ] **Step 1: Escrever teste de contrato da action**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/app/booking/[slug]/actions.ts'), 'utf8')

describe('booking actions product contract', () => {
  it('loads active products with stock and sends them to the wrapper RPC', () => {
    expect(source).toContain(".from('products')")
    expect(source).toContain(".select('id, name, description, category, sale_price, stock_quantity, image_url')")
    expect(source).toContain(".eq('is_active', true)")
    expect(source).toContain("supabase.rpc(\n    'create_public_appointment_with_products'")
    expect(source).toContain('p_products: input.products || []')
  })

  it('maps stock conflicts to structured client data', () => {
    expect(source).toContain("code: 'INSUFFICIENT_STOCK'")
    expect(source).toContain('unavailableProducts')
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- tests/unit/booking-actions-contract.test.ts`

Expected: FAIL nas strings de produtos/RPC.

- [ ] **Step 3: Carregar produtos no Server Component**

Em `getBookingPageData`, adicionar uma query filtrada por tenant e atividade:

```ts
const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, name, description, category, sale_price, stock_quantity, image_url')
  .eq('barbershop_id', barbershop.id)
  .eq('is_active', true)
  .order('name')

if (productsError) console.error('Error loading public products:', productsError.message)

return {
  barbershop,
  services: services || [],
  barbers: barbers || [],
  addOns: addOns || [],
  products: products || [],
}
```

Em `page.tsx`, passar `products={data.products}` para `BookingClient`.

- [ ] **Step 4: Alterar o payload e a RPC**

```ts
import type { SelectedBookingProduct, UnavailableProduct } from './booking-types'

export type CreatePublicBookingInput = {
  // campos existentes permanecem
  products?: SelectedBookingProduct[]
}

const { data: appointmentId, error } = await supabase.rpc(
  'create_public_appointment_with_products',
  {
    p_barbershop_id: input.barbershopId,
    p_client_name: input.clientName,
    p_client_phone: input.clientPhone,
    p_client_email: input.clientEmail || null,
    p_barber_id: finalBarberId,
    p_service_id: input.serviceId,
    p_start_at: input.startAt,
    p_notes: input.notes || null,
    p_add_on_ids: input.addOnIds || null,
    p_products: input.products || [],
  },
)

if (error?.message === 'INSUFFICIENT_STOCK') {
  let unavailableProducts: UnavailableProduct[] = []
  try { unavailableProducts = JSON.parse(error.details || '[]') }
  catch { unavailableProducts = [] }
  return {
    error: 'Alguns produtos tiveram o estoque alterado. Ajuste as quantidades para continuar.',
    code: 'INSUFFICIENT_STOCK' as const,
    unavailableProducts,
  }
}
```

Preservar o tratamento atual para qualquer outro erro e o envio de WhatsApp. Acrescentar ao WhatsApp apenas os nomes/quantidades dos produtos selecionados e o aviso de pagamento no local; não consultar nem registrar `product_sales`.

- [ ] **Step 5: Verificar e commit**

Run: `npm test -- tests/unit/booking-actions-contract.test.ts`

Expected: PASS, 2 tests.

Run: `npm run lint`

Expected: exit 0.

```bash
git add src/app/booking/[slug]/actions.ts src/app/booking/[slug]/page.tsx tests/unit/booking-actions-contract.test.ts
git commit -m "feat: expose products to public bookings"
```

---

### Task 4: Componentes visuais reutilizáveis

**Files:**
- Create: `src/app/booking/[slug]/booking-progress.tsx`
- Create: `src/app/booking/[slug]/booking-product-step.tsx`
- Create: `src/app/booking/[slug]/booking-summary-bar.tsx`
- Create: `src/app/booking/[slug]/booking-success.tsx`
- Create: `tests/unit/booking-ui.test.ts`

**Interfaces:**
- Consumes: tipos e helpers da Task 2.
- Produces: componentes controlados sem persistência própria.

- [ ] **Step 1: Escrever o contrato visual/semântico**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (name: string) => readFileSync(resolve(process.cwd(), `src/app/booking/[slug]/${name}`), 'utf8')

describe('booking visual contract', () => {
  it('renders seven accessible steps in the approved palette', () => {
    const source = read('booking-progress.tsx')
    expect(source).toContain('aria-current={isActive ? \'step\' : undefined}')
    expect(source).toContain('Etapa {currentStep} de {steps.length}')
    expect(source).toContain('#C79A4A')
    expect(source).toContain('#1A1A1D')
  })

  it('disables sold-out products and exposes quantity controls', () => {
    const source = read('booking-product-step.tsx')
    expect(source).toContain('Esgotado')
    expect(source).toContain('Pagamento e retirada na barbearia')
    expect(source).toContain('aria-label={`Diminuir quantidade de ${product.name}`}')
    expect(source).toContain('aria-label={`Aumentar quantidade de ${product.name}`}')
  })

  it('uses pay-at-shop copy in success state', () => {
    const source = read('booking-success.tsx')
    expect(source).toContain('Agendamento confirmado')
    expect(source).toContain('Total a pagar na barbearia')
    expect(source).not.toContain('Total Pago')
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- tests/unit/booking-ui.test.ts`

Expected: FAIL por arquivos inexistentes.

- [ ] **Step 3: Implementar `BookingProgress`**

Criar props controladas:

```ts
interface BookingProgressProps {
  steps: readonly { id: number; name: string }[]
  currentStep: number
}
```

Renderizar desktop com círculos/linhas e mobile com `Etapa {currentStep} de {steps.length}`. Usar `aria-current="step"`, Montserrat nos rótulos, superfície `#1A1A1D`, selecionado `#C79A4A` e concluído com ícone `Check`.

- [ ] **Step 4: Implementar `BookingProductStep`**

```ts
interface BookingProductStepProps {
  products: BookingProduct[]
  quantities: SelectedProductQuantities
  unavailableProductIds: Set<string>
  onQuantityChange: (product: BookingProduct, quantity: number) => void
  onSkip: () => void
}
```

Para cada produto, usar container com `role="group"`, imagem em caixa de proporção fixa, fallback com `Package`, estoque visível e botões `Minus`/`Plus`. Definir `disabled={product.stock_quantity === 0}` e impedir incremento em `quantity >= product.stock_quantity`. Mostrar `Esgotado` para zero e alerta dourado/vermelho para IDs devolvidos pela RPC.

- [ ] **Step 5: Implementar barra e sucesso**

`BookingSummaryBar` recebe `currentStep`, `isSubmitting`, `canContinue`, `serviceSubtotal`, `productSubtotal`, `total`, `onBack`, `onNext`, `onConfirm`. Ela fica fixa, reserva espaço no conteúdo e troca a ação final para `Confirmar agendamento`.

`BookingSuccess` recebe os objetos já selecionados, subtotais e callback de reset. Reproduzir a referência enviada: check dourado animado, card translúcido, dados de serviço/profissional/data/hora, lista de adicionais, lista de produtos e `Total a pagar na barbearia`. Envolver animações em `motion-safe:` e fornecer estado equivalente sem movimento.

- [ ] **Step 6: Verificar e commit**

Run: `npm test -- tests/unit/booking-ui.test.ts`

Expected: PASS, 3 tests.

```bash
git add src/app/booking/[slug]/booking-progress.tsx src/app/booking/[slug]/booking-product-step.tsx src/app/booking/[slug]/booking-summary-bar.tsx src/app/booking/[slug]/booking-success.tsx tests/unit/booking-ui.test.ts
git commit -m "feat: build premium booking components"
```

---

### Task 5: Integrar o wizard de sete etapas

**Files:**
- Modify: `src/app/booking/[slug]/booking-client.tsx:1-709`
- Modify: `src/app/booking/[slug]/page.tsx:18-29`
- Modify: `tests/unit/booking-ui.test.ts`

**Interfaces:**
- Consumes: componentes das Tasks 2–4 e `products` da Task 3.
- Produces: fluxo público completo e preservação de estado em conflito de estoque.

- [ ] **Step 1: Ampliar o teste do wizard**

Adicionar ao `booking-ui.test.ts`:

```ts
it('keeps the approved seven-step order and product payload', () => {
  const source = read('booking-client.tsx')
  const labels = ['Serviço', 'Profissional', 'Adicionais', 'Produtos', 'Data e Hora', 'Dados', 'Confirmação']
  labels.forEach((label) => expect(source).toContain(`name: '${label}'`))
  expect(source).toContain('currentStep === 4')
  expect(source).toContain('products: toSelectedProducts(selectedProducts)')
  expect(source).toContain("response.code === 'INSUFFICIENT_STOCK'")
  expect(source).toContain('setCurrentStep(4)')
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- tests/unit/booking-ui.test.ts`

Expected: FAIL na ordem/payload.

- [ ] **Step 3: Atualizar estado, ordem e validações**

Alterar `STEPS` para sete itens na ordem global. Adicionar:

```ts
const [selectedProducts, setSelectedProducts] = useState<SelectedProductQuantities>({})
const [unavailableProductIds, setUnavailableProductIds] = useState<Set<string>>(new Set())

const totals = getBookingTotals(
  serviceObj?.price ?? 0,
  addOnsObj.map((item) => item.price),
  products,
  selectedProducts,
)
```

Mover data/hora para etapa 5, dados para etapa 6 e confirmação para etapa 7. Etapa 4 nunca bloqueia avanço. O botão `Pular produtos` limpa a seleção e chama `handleNext()`.

- [ ] **Step 4: Integrar confirmação e conflito de estoque**

No payload:

```ts
products: toSelectedProducts(selectedProducts),
```

No retorno da action:

```ts
if (response.code === 'INSUFFICIENT_STOCK') {
  const unavailable = response.unavailableProducts ?? []
  setUnavailableProductIds(new Set(unavailable.map((item) => item.productId)))
  setSelectedProducts((current) => {
    let next = current
    for (const item of unavailable) {
      const product = products.find((candidate) => candidate.id === item.productId)
      if (product) next = setProductQuantity(next, { ...product, stock_quantity: item.availableQuantity }, current[item.productId] ?? 0)
    }
    return next
  })
  setCurrentStep(4)
  setErrorMsg(response.error)
  return
}
```

Não limpar nenhum outro campo. Limpar `unavailableProductIds` quando o cliente ajustar a quantidade afetada.

- [ ] **Step 5: Aplicar o shell visual aprovado**

Substituir o cabeçalho central antigo por `BookingHeader` inline ou extraído no mesmo arquivo, com nome da barbearia e `Cancelar`. Usar `BookingProgress`, `BookingProductStep`, `BookingSummaryBar` e `BookingSuccess`. Padronizar cards existentes com `#1A1A1D`, borda branca de baixa opacidade, dourado selecionado e raios de 8–12 px. Preservar handlers, slots, máscara de telefone e campos atuais.

- [ ] **Step 6: Verificar e commit**

Run: `npm test -- tests/unit/booking-ui.test.ts tests/unit/booking-utils.test.ts tests/unit/booking-actions-contract.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

```bash
git add src/app/booking/[slug]/booking-client.tsx src/app/booking/[slug]/page.tsx tests/unit/booking-ui.test.ts
git commit -m "feat: integrate seven-step booking flow"
```

---

### Task 6: Expor produtos reservados para a operação

**Files:**
- Modify: `src/app/dashboard/reservas/page.tsx:20-43`
- Modify: `src/app/dashboard/reservas/reservas-client.tsx:1-460`
- Modify: `src/app/dashboard/agenda/actions.ts:1-92`
- Modify: `src/app/dashboard/agenda/agenda-client.tsx:520-610`
- Create: `tests/unit/booking-reservations-dashboard.test.ts`

**Interfaces:**
- Consumes: relação `appointment_products(product_id, quantity, unit_price, status, products(name, image_url))`.
- Produces: detalhe operacional de itens para retirada, sem marcar pagamento.

- [ ] **Step 1: Escrever teste de contrato do dashboard**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('reserved products in appointment details', () => {
  it('queries and renders reserved products', () => {
    expect(source('src/app/dashboard/reservas/page.tsx')).toContain('appointment_products')
    expect(source('src/app/dashboard/agenda/actions.ts')).toContain('appointment_products')
    expect(source('src/app/dashboard/reservas/reservas-client.tsx')).toContain('Produtos para retirada')
    expect(source('src/app/dashboard/agenda/agenda-client.tsx')).toContain('Pagamento pendente na barbearia')
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts`

Expected: FAIL nas consultas/textos.

- [ ] **Step 3: Incluir relação nas consultas**

Adicionar a ambos os selects Supabase:

```ts
appointment_products (
  quantity,
  unit_price,
  status,
  products ( name, image_url )
)
```

Manter sempre o filtro explícito de `barbershop_id` existente para ajudar o plano de consulta e reforçar o tenant.

- [ ] **Step 4: Renderizar somente informação operacional**

Nos detalhes de Reservas e Agenda, quando houver itens com `status === 'reserved'`, mostrar seção `Produtos para retirada`, linhas com nome, quantidade e preço capturado, subtotal e texto `Pagamento pendente na barbearia`. Não criar botão de pagamento, não inserir `product_sales` e não somar ao `appointments.total_price`.

- [ ] **Step 5: Verificar cancelamento e commit**

Run: `npm test -- tests/unit/booking-reservations-dashboard.test.ts tests/unit/booking-products-migration.test.ts`

Expected: PASS.

```bash
git add src/app/dashboard/reservas/page.tsx src/app/dashboard/reservas/reservas-client.tsx src/app/dashboard/agenda/actions.ts src/app/dashboard/agenda/agenda-client.tsx tests/unit/booking-reservations-dashboard.test.ts
git commit -m "feat: show reserved products on appointments"
```

---

### Task 7: E2E, build e fidelidade visual

**Files:**
- Create: `tests/e2e/booking-products.spec.ts`
- Modify only if a verified mismatch exists: booking files from Tasks 3–6.

**Interfaces:**
- Consumes: fluxo completo implementado.
- Produces: evidência funcional, responsiva e visual.

- [ ] **Step 1: Criar o teste E2E público**

Criar um teste que use a barbearia/serviço/barbeiro/produtos de fixture do ambiente E2E e cubra:

```ts
import { test, expect } from '@playwright/test'

test('reserva produto disponível e permite pular a etapa', async ({ page }) => {
  await page.goto('/booking/e2e-booking')
  await page.getByRole('button', { name: /serviço e2e/i }).click()
  await page.getByRole('button', { name: /qualquer profissional/i }).click()
  await page.getByRole('button', { name: /avançar/i }).click()
  await page.getByRole('button', { name: /avançar/i }).click()

  await expect(page.getByText('Pagamento e retirada na barbearia')).toBeVisible()
  await expect(page.getByText('Esgotado')).toBeVisible()
  await page.getByRole('button', { name: /aumentar quantidade de produto e2e/i }).click()
  await expect(page.getByText(/subtotal de produtos/i)).toBeVisible()
})
```

Se a fixture pública ainda não existir, criá-la no setup E2E usando as mesmas ações administrativas já empregadas em `tests/e2e/fluxo-principal.spec.ts`, com slug fixo `e2e-booking`, um produto com estoque 2 e outro com estoque 0.

- [ ] **Step 2: Rodar toda a suíte unitária**

Run: `npm test`

Expected: todas as suites PASS.

- [ ] **Step 3: Rodar lint e build**

Run: `npm run lint`

Expected: exit 0, sem novos erros.

Run: `npm run build`

Expected: build Next.js concluído com sucesso.

- [ ] **Step 4: Rodar o E2E**

Run: `npm run test:e2e -- tests/e2e/booking-products.spec.ts`

Expected: PASS no Chromium.

- [ ] **Step 5: Verificar no Browser/IAB em desktop e mobile**

Abrir o fluxo real no navegador. Verificar serviço → profissional → adicionais → produtos → data/hora → dados → confirmação → sucesso. Repetir sem selecionar produtos. Em viewport desktop e mobile, capturar screenshots de serviço, produtos, confirmação e sucesso.

Comparar diretamente com os três HTMLs fornecidos nestes pontos:

1. cabeçalho transacional e progresso;
2. paleta `#1A1A1D`/`#C79A4A` e contraste;
3. Montserrat/Inter e escala tipográfica;
4. anatomia de cards, bordas e raios;
5. barra inferior fixa sem cobrir conteúdo;
6. resumo final, produtos e cópia de pagamento no local;
7. ausência de overflow no mobile.

- [ ] **Step 6: Inspecionar imagens lado a lado**

Usar `view_image` nas referências renderizadas e nas últimas screenshots do browser. Corrigir qualquer diferença que receberia comentário de uma revisão de agência. Repetir captura e inspeção até não restarem diferenças materiais.

- [ ] **Step 7: Rodar verificação final e commit**

Run: `npm test`

Expected: todas as suites PASS.

Run: `npm run lint`

Expected: exit 0.

Run: `npm run build`

Expected: build concluído com exit 0.

```bash
git add tests/e2e/booking-products.spec.ts src/app/booking src/app/dashboard/reservas src/app/dashboard/agenda
git commit -m "test: verify booking products flow"
```

---

## Final Verification Checklist

- [ ] Sete etapas aparecem na ordem aprovada em desktop e mobile.
- [ ] É possível concluir agendamento sem produtos.
- [ ] Produto esgotado está visível, explicado e desabilitado na listagem.
- [ ] Quantidade nunca ultrapassa o estoque carregado.
- [ ] Conflito de estoque retorna à etapa 4 sem perder dados.
- [ ] RPC usa bloqueio de linha e transação única; não há estoque negativo.
- [ ] Cancelar duas vezes não devolve estoque em duplicidade.
- [ ] Produtos reservados aparecem nos detalhes administrativos.
- [ ] Nenhuma reserva gera venda/receita paga antecipadamente.
- [ ] Referências e render final foram inspecionados com `view_image`.
- [ ] Desktop e mobile não têm conteúdo coberto, overflow ou rótulos comprimidos.
- [ ] `npm test`, `npm run lint`, `npm run build` e E2E passam.
