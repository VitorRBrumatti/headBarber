# Rollout de assinaturas de clientes

Este procedimento ativa assinaturas por barbearia, em expansão gradual. Todas as flags começam desligadas. Nunca apague ciclos, alocações ou receitas para fazer rollback.

## Ordem obrigatória de ativação

1. Aplicar as migrações da Fase A com `client_subscriptions_admin_enabled`, `client_subscriptions_booking_enabled` e `client_subscriptions_settlement_enabled` em `false`.
2. Verificar contagens nulas do backfill, RLS e os advisors disponíveis no ambiente.
3. Ativar `client_subscriptions_admin_enabled` para uma única barbearia interna.
4. Ativar `client_subscriptions_booking_enabled` somente depois de observar paridade entre prévia e confirmação.
5. Ativar `client_subscriptions_settlement_enabled` somente quando a consulta de divergência de receitas retornar zero.
6. Observar origens duplicadas, snapshots nulos, promoções de espera e divergência financeira durante toda a janela.
7. Em rollback, desligar apenas a flag mais recente. Nunca apagar o histórico de assinaturas.
8. Remover contratos legados somente em uma migração posterior e após a janela de observação.

## Verificações antes da ativação

```sql
select
  count(*) filter (where commissionable_total is null) as commissionable_nulls,
  count(*) filter (where commission_percentage_snapshot is null) as percentage_nulls,
  count(*) filter (where commission_amount is null) as commission_nulls,
  count(*) filter (where amount_due is null) as amount_due_nulls
from public.appointments;
```

O resultado esperado é zero em todas as colunas. Rode também os testes pgTAP, o lint do banco e os advisors suportados pela versão instalada da CLI.

## Monitoramento

Receitas automáticas duplicadas:

```sql
select barbershop_id, source, reference_id, count(*)
from public.revenues
where source <> 'manual' and reference_id is not null
group by barbershop_id, source, reference_id
having count(*) > 1;
```

Benefícios acima do limite mensal:

```sql
select entitlement.id, entitlement.monthly_limit,
       count(*) filter (where allocation.status in ('reserved','consumed')) as allocated
from public.subscription_cycle_entitlements entitlement
join public.appointment_subscription_allocations allocation
  on allocation.cycle_entitlement_id = entitlement.id
where entitlement.monthly_limit is not null
group by entitlement.id, entitlement.monthly_limit
having count(*) filter (where allocation.status in ('reserved','consumed'))
  > entitlement.monthly_limit;
```

Espera parada apesar de existir cota livre:

```sql
select entitlement.id,
       entitlement.monthly_limit,
       count(*) filter (where allocation.status in ('reserved','consumed')) as used,
       count(*) filter (where allocation.status = 'waiting') as waiting
from public.subscription_cycle_entitlements entitlement
join public.appointment_subscription_allocations allocation
  on allocation.cycle_entitlement_id = entitlement.id
where entitlement.monthly_limit is not null
group by entitlement.id, entitlement.monthly_limit
having count(*) filter (where allocation.status = 'waiting') > 0
   and count(*) filter (where allocation.status in ('reserved','consumed'))
       < entitlement.monthly_limit;
```

Violação do valor devido:

```sql
select id, total_price, subscription_covered_total, amount_due
from public.appointments
where amount_due <> total_price - subscription_covered_total
   or subscription_covered_total < 0
   or subscription_covered_total > total_price;
```

Divergência entre receita automática e sua origem:

```sql
with expected as (
  select appointment.id as reference_id, appointment.barbershop_id,
         appointment.amount_due as expected_amount
  from public.appointments appointment
  where appointment.status = 'completed' and appointment.amount_due > 0
), actual as (
  select revenue.reference_id, revenue.barbershop_id, revenue.amount
  from public.revenues revenue
  where revenue.source = 'appointment_service'
)
select coalesce(expected.barbershop_id, actual.barbershop_id) as barbershop_id,
       coalesce(expected.reference_id, actual.reference_id) as reference_id,
       expected.expected_amount, actual.amount
from expected
full join actual using (barbershop_id, reference_id)
where expected.reference_id is null
   or actual.reference_id is null
   or expected.expected_amount <> actual.amount;
```

## Rollback

Desligue na ordem inversa: liquidação, agendamento e administração. Depois de desligar uma flag, confirme que os fluxos legados voltaram a operar e preserve todas as linhas históricas. Corrija dados somente por uma operação auditável da origem ou por uma nova migração; nunca por exclusão ad hoc.
