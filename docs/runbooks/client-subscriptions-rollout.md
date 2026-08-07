# Rollout de assinaturas de clientes

As assinaturas ficam ativas automaticamente para todas as barbearias. As três flags continuam disponíveis somente como chaves de emergência: desligá-las preserva ciclos, alocações, receitas e todo o histórico.

## Ativação automática

A migration `client_subscriptions_default_enabled` executa três ações:

1. cria a linha de `barbershop_settings` para qualquer barbearia que ainda não tenha configurações;
2. liga `client_subscriptions_admin_enabled`, `client_subscriptions_booking_enabled` e `client_subscriptions_settlement_enabled` nas linhas existentes;
3. define `true` como padrão das três colunas para novas barbearias.

Não é necessário ativar as flags manualmente após cadastrar uma barbearia.

## Verificações após a migration

```sql
select
  count(*) filter (where not client_subscriptions_admin_enabled) as admin_disabled,
  count(*) filter (where not client_subscriptions_booking_enabled) as booking_disabled,
  count(*) filter (where not client_subscriptions_settlement_enabled) as settlement_disabled
from public.barbershop_settings;
```

O resultado esperado é zero em todas as colunas. Confirme também que nenhuma barbearia está sem configurações:

```sql
select barbershop.id
from public.barbershops as barbershop
left join public.barbershop_settings as settings
  on settings.barbershop_id = barbershop.id
where settings.barbershop_id is null;
```

A consulta deve retornar zero linhas. Rode também os testes pgTAP, o lint do banco e os advisors suportados pela versão instalada da CLI.

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
