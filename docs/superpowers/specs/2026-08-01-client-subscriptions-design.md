# Assinaturas de clientes — design aprovado

**Data:** 2026-08-01  
**Status:** aprovado para planejamento técnico  
**Estratégia:** evolução vertical e incremental em uma única worktree

## Objetivo

Permitir que cada barbearia venda planos mensais próprios aos seus clientes, receba a mensalidade fora da HeadBarber e registre o pagamento no sistema. Um ciclo pago concede serviços e adicionais limitados ou ilimitados sem transformar o preço operacional do atendimento em zero e sem duplicar receitas.

Esta assinatura é independente da assinatura SaaS da barbearia com a HeadBarber, atualmente armazenada em `public.subscriptions` e processada pela Stripe.

## Decisões de produto

- A HeadBarber não processa a mensalidade do cliente final.
- O estabelecimento registra manualmente cada pagamento e sua forma de pagamento.
- Produtos físicos não fazem parte dos benefícios nesta versão.
- Um cliente pode ter no máximo uma assinatura ativa por barbearia.
- Um pagamento cria exatamente um ciclo, um snapshot dos benefícios e uma receita.
- Benefícios são avaliados pela data do atendimento.
- Alterações no catálogo do plano só afetam ciclos futuros.
- Uma troca de plano é agendada em `pending_plan_id` e efetivada no próximo pagamento.
- Pausar ou cancelar uma assinatura não altera ciclos já pagos nem coberturas já reservadas.
- `paused` pode ser reativada; `cancelled` é terminal e uma nova adesão cria outro vínculo.
- Cancelamento de atendimento libera benefícios; no-show consome benefícios.
- A base recomendada de comissão é o valor bruto executado, inclusive quando coberto.
- Não haverá OTP, SMS ou verificação por WhatsApp. No agendamento público, o cliente continuará sendo resolvido pelo telefone normalizado informado. O nome é dado cadastral, não autenticação. O risco de uso indevido por alguém que conheça o telefone do assinante é aceito explicitamente para esta versão.

## Regra de cobertura futura

Um agendamento criado para um período ainda não pago nasce com preço normal e fica marcado como elegível, aguardando um ciclo.

Quando a mensalidade é registrada, a mesma transação:

1. cria o ciclo e seus entitlements;
2. encontra agendamentos não terminais e elegíveis dentro do período;
3. ordena por data e hora do atendimento, com `appointment_id` como desempate;
4. reserva as cotas disponíveis para os agendamentos mais próximos;
5. recalcula o valor coberto e o valor devido;
6. marca itens elegíveis sem cota como aguardando disponibilidade.

A cobertura concedida fica travada no agendamento. Um novo agendamento mais próximo nunca retira automaticamente a cobertura de outro já confirmado.

Quando uma cobertura limitada é liberada, o sistema promove automaticamente o agendamento elegível mais próximo daquele ciclo. A promoção apenas melhora a condição do cliente; não existe rebaixamento automático de cobertura.

Exemplo para uma cota de dois cortes:

- 5 de agosto: coberto;
- 12 de agosto: coberto;
- 20 de agosto: aguardando cota e com preço normal.

Se o atendimento de 12 de agosto for cancelado, o de 20 de agosto passa a ser coberto na mesma transação do cancelamento.

## Modelo de dados

### `subscription_plans`

Plano configurável da barbearia:

- `id`, `barbershop_id`, `name`, `description`;
- `monthly_price`, `is_active`, `configuration_version`;
- `created_at`, `updated_at`.

Planos utilizados são arquivados, nunca excluídos fisicamente.

### `subscription_plan_items`

Benefícios atuais do plano:

- `id`, `barbershop_id`, `plan_id`;
- `item_type`: `service` ou `add_on`;
- `service_id` ou `add_on_id`, com restrição XOR;
- `monthly_limit`: inteiro positivo ou `NULL` para ilimitado.

As referências são aos itens globais da barbearia, não a `barber_service_id` ou `barber_add_on_id`.

### `client_subscriptions`

Vínculo permanente entre cliente e plano:

- `id`, `barbershop_id`, `client_id`, `plan_id`;
- `pending_plan_id`, quando houver troca agendada;
- `status`: `active`, `paused` ou `cancelled`;
- `started_on`, `next_billing_date`, `cancelled_at`, `notes`;
- `created_at`, `updated_at`.

Um índice único parcial impede duas assinaturas `active` para o mesmo cliente e barbearia. Uma assinatura pausada também não pode ser contornada por uma segunda adesão ativa; a RPC de adesão deve exigir reativação ou cancelamento explícito do vínculo existente.

### `subscription_cycles`

Mensalidade e período de consumo:

- `id`, `barbershop_id`, `client_subscription_id`;
- `period_start`, `period_end` exclusivo;
- `status`: `pending`, `paid`, `expired` ou `cancelled`;
- `plan_id_snapshot`, `plan_name_snapshot`, `price_snapshot`;
- `payment_method`, `paid_at`, `revenue_id`;
- `created_at`, `updated_at`.

Deve haver restrições para `period_end > period_start`, unicidade idempotente do período e prevenção de sobreposição de ciclos pagos da mesma assinatura.

### `subscription_cycle_entitlements`

Snapshot imutável dos benefícios do ciclo:

- `id`, `barbershop_id`, `cycle_id`;
- `item_type`, `service_id` ou `add_on_id`;
- `item_name_snapshot`, `monthly_limit`;
- `created_at`.

### `appointment_subscription_allocations`

Auditoria por item elegível do atendimento:

- `id`, `barbershop_id`, `appointment_id`;
- `cycle_entitlement_id`;
- `item_type`, `service_id` ou `add_on_id`;
- `covered_amount`;
- `status`: `waiting`, `reserved`, `consumed` ou `released`;
- `reserved_at`, `consumed_at`, `released_at`;
- `created_at`, `updated_at`.

`waiting` representa um item previsto no plano, mas sem cota disponível. Uma alocação promovida muda de `waiting` para `reserved` e dispara o recálculo financeiro do atendimento.

## Campos financeiros do atendimento

Adicionar a `appointments`:

- `subscription_coverage_status`: `none`, `awaiting_cycle`, `waiting`, `partial` ou `covered`;
- `subscription_covered_total`;
- `amount_due`;
- `commissionable_total`;
- `commission_percentage_snapshot`;
- `commission_amount`;

Semântica:

- `total_price`: preço bruto do serviço e adicionais;
- `subscription_covered_total`: parte coberta pelos benefícios reservados;
- `amount_due`: parte do atendimento ainda cobrada do cliente;
- `commissionable_total`: base histórica da comissão;
- produtos continuam fora de `total_price` e são liquidados separadamente.

As RPCs mantêm a invariável:

`amount_due = total_price - subscription_covered_total`

com cobertura entre zero e o valor bruto.

## Fonte de verdade e transações

### Registro de mensalidade

Uma RPC administrativa autenticada:

- valida o tenant a partir de `auth.uid()` e não confia em `barbershop_id` enviado pelo cliente;
- bloqueia a assinatura;
- garante idempotência por assinatura e período;
- efetiva `pending_plan_id`, quando houver;
- cria o ciclo e copia os benefícios;
- cria uma única receita `monthly_plan` com origem `subscription_cycle`;
- reconcilia agendamentos futuros elegíveis;
- atualiza `next_billing_date`;
- retorna recibo autoritativo.

### Criação de agendamento

Uma função central no schema `private` concentra validação, disponibilidade, snapshots, produtos, benefícios e valores. Wrappers públicos separados atendem:

- agendamento anônimo;
- agendamento administrativo autenticado;
- prévia;
- futura remarcação.

Se já existe ciclo pago, o agendamento reserva benefícios ou cria registros `waiting`. Se não existe ciclo pago, o atendimento fica com preço normal e `awaiting_cycle` quando houver assinatura elegível.

### Conclusão

Uma RPC administrativa substitui a atualização direta para `completed`:

- valida e bloqueia o atendimento;
- transforma `reserved` em `consumed`;
- cria receita de serviço somente para `amount_due > 0`;
- transforma produtos `reserved` em `sold`;
- cria `product_sales` e receita de produto;
- grava a forma de pagamento;
- finaliza o atendimento de forma idempotente.

### Cancelamento

Uma RPC administrativa:

- muda `reserved` para `released`;
- libera estoque reservado;
- promove as alocações `waiting` mais próximas por entitlement;
- recalcula os atendimentos promovidos;
- não cria receita.

### No-show

Uma RPC administrativa:

- muda `reserved` para `consumed`;
- libera produtos reservados;
- não promove a cota consumida;
- não cria receita de produto.

## Ledger financeiro

Adicionar `source` em `revenues`:

- `manual`;
- `appointment_service`;
- `appointment_product`;
- `subscription_cycle`.

Receitas automáticas possuem referência de origem única e não podem ser removidas pela ação manual. Correções usam a operação de origem ou um estorno auditável.

O gatilho legado que cria receita pelo `appointments.total_price` deve permanecer durante a expansão, mas ser desativado antes da feature flag de liquidação ser habilitada.

O financeiro usa:

- `appointments` para volume de atendimentos e ticket operacional;
- `revenues` para faturamento;
- `product_sales` para produtos vendidos;
- `client_subscriptions` para assinantes;
- `appointment_subscription_allocations` para consumo.

Valor coberto é métrica operacional, nunca faturamento.

## Segurança e acesso

- RLS é obrigatória em todas as novas tabelas públicas.
- Políticas administrativas combinam `TO authenticated` com isolamento por barbearia.
- As novas tabelas recebem também a política restritiva da assinatura SaaS da barbearia.
- Grants da Data API são explícitos e limitados às operações usadas.
- Funções privilegiadas internas ficam em `private`, com `search_path = ''` e `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`.
- Wrappers `SECURITY DEFINER` públicos revogam execução de `PUBLIC` e verificam identidade/tenant quando administrativos.
- O wrapper anônimo expõe somente catálogo, prévia e confirmação necessárias ao agendamento público.
- Restrições, FKs compostas e validações impedem referências entre barbearias.

## Feature flags e rollout

Adicionar flags por barbearia, inicialmente `false`:

- `client_subscriptions_admin_enabled`;
- `client_subscriptions_booking_enabled`;
- `client_subscriptions_settlement_enabled`.

### Fase A — Fundação e administração

- schema, RLS, índices e backfill financeiro;
- CRUD de planos e assinaturas;
- registro de mensalidade e reconciliação;
- interface administrativa inicial;
- fluxos legados permanecem ativos.

### Fase B — Agendamento

- núcleo privado compartilhado;
- prévia, reserva, espera e promoção;
- migração dos wrappers público e administrativo;
- recibos e mappers compatíveis;
- ativação por `client_subscriptions_booking_enabled`.

### Fase C — Liquidação

- conclusão, cancelamento e no-show transacionais;
- venda de produtos e receitas idempotentes;
- retirada do gatilho financeiro legado;
- ativação por `client_subscriptions_settlement_enabled` somente após os gates.

### Fase D — Relatórios e estabilização

- métricas financeiras e operacionais;
- observabilidade de erros e divergências;
- período de estabilidade;
- remoção dos contratos antigos e aplicação posterior de `NOT NULL` onde seguro.

## Gates obrigatórios

Cada fase exige, antes do commit de ativação:

- testes unitários e de contrato verdes;
- testes SQL reais para constraints, RLS, idempotência e concorrência;
- build de produção e TypeScript verdes;
- revisão dos grants, RLS e funções privilegiadas;
- compatibilidade com dados e RPCs legados;
- rollback documentado;
- feature flag desligada por padrão.

Antes da ativação de liquidação, também são obrigatórios testes ponta a ponta para mensalidade, cobertura, espera, promoção, conclusão, produtos e faturamento sem duplicidade.

## Cenários críticos de teste

- pagamento duplicado cria um ciclo e uma receita;
- ciclo futuro pago reconcilia agendamentos existentes em ordem cronológica;
- novo agendamento mais próximo não rouba cobertura já reservada;
- cancelamento promove o próximo `waiting` elegível;
- concorrência de promoção não reserva a mesma cota duas vezes;
- ilimitado cobre múltiplos atendimentos;
- no-show consome o benefício;
- troca de plano só entra no próximo pagamento;
- pausa e cancelamento preservam o ciclo pago;
- conclusão repetida não duplica receita nem venda;
- serviço coberto gera receita somente do valor devido;
- produtos geram receita normal na conclusão;
- comissão usa snapshots históricos;
- atendimentos totalmente cobertos continuam nas métricas;
- RLS e FKs impedem acesso e referências entre barbearias.

## Fora de escopo

- cobrança automática do cliente final;
- inclusão de produtos físicos no plano;
- OTP, SMS ou verificação de identidade por WhatsApp;
- retirada automática de uma cobertura já concedida;
- exclusão física de planos com histórico;
- reinterpretação retroativa de ciclos pagos.
