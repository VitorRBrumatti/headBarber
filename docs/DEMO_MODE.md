# Colocar a demo no ar

## Resposta curta

Para a demo **que já existe**, faça nesta ordem:

1. faça o merge da branch `codex/demo-mode`;
2. rode somente a migration pendente;
3. registre a conta/barbearia demo uma vez no Supabase;
4. rode `npm run demo:provision`;
5. teste `/demo` em janela anônima.

Se a Vercel publicar automaticamente logo após o merge, `/demo` ficará
temporariamente indisponível até os passos 2 e 3. Isso é intencional e seguro;
o restante da aplicação continua funcionando.

## Passo a passo para a demo existente

### 1. Merge

Faça o merge do PR da branch `codex/demo-mode` na `main` e atualize seu repositório local.

### 2. Migration do Supabase

Primeiro confira o que será aplicado:

```sh
npx supabase db push --dry-run --linked
```

A saída deve mostrar como pendente a migration:

```text
20260831170149_harden_demo_security.sql
```

Se aparecer outra migration inesperada, pare e revise. Se estiver correto, aplique:

```sh
npx supabase db push --linked
```

Não execute migrations antigas manualmente e não cole a migration inteira no SQL Editor.

### 3. Registrar a demo antiga

Esse passo existe porque a correção não confia automaticamente em qualquer perfil
que tenha `demo_mode = true`.

No Supabase, abra **SQL Editor**, execute esta consulta e confirme que aparece
somente a conta e a barbearia fictícias da demo:

```sql
select
  p.id as user_id,
  u.email,
  p.barbershop_id,
  b.name,
  b.slug,
  p.role,
  s.stripe_customer_id,
  s.stripe_subscription_id
from public.profiles p
join auth.users u on u.id = p.id
join public.barbershops b on b.id = p.barbershop_id
left join public.subscriptions s on s.user_id = p.id
where p.demo_mode = true;
```

Antes de continuar, confira:

- o e-mail é o `DEMO_ACCOUNT_EMAIL`;
- o slug é o `DEMO_BOOKING_SLUG`;
- `role` é `owner`;
- os dois campos `stripe_*` estão vazios;
- a barbearia não contém dados ou usuários reais.

Copie `user_id` e `barbershop_id` do resultado. Depois execute, substituindo os
dois valores:

```sql
insert into public.demo_accounts (user_id, barbershop_id)
values ('COLE_O_USER_ID', 'COLE_O_BARBERSHOP_ID');
```

Se o Supabase recusar esse `insert`, não tente contornar a validação: revise os dados.
Esse registro é feito uma única vez.

### 4. Restaurar os dados demo

Com as variáveis da demo no `.env.local`, execute:

```sh
npm run demo:provision
```

O comando deve terminar com uma mensagem semelhante a:

```text
Demo pronta: /demo (agendamento público em /booking/headbarber-demo)
```

Esse comando apaga e recria a atividade fictícia da demo. Não o execute antes de
confirmar que a barbearia registrada não contém dados reais.

### 5. Vercel

Em **Project → Settings → Environment Variables → Production**, confira:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEMO_ACCOUNT_EMAIL
DEMO_ACCOUNT_PASSWORD
DEMO_BOOKING_SLUG
CRON_SECRET
```

Regras importantes:

- `DEMO_ACCOUNT_EMAIL`, senha e slug devem ser os mesmos usados no provisionamento;
- `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_ACCOUNT_PASSWORD` e `CRON_SECRET` nunca levam
  o prefixo `NEXT_PUBLIC_`;
- `CRON_SECRET` é um segredo aleatório criado por você, não fornecido pelo Supabase;
- se alterar qualquer variável na Vercel, faça um novo deploy de Production.

O `vercel.json` já agenda o reset diariamente às 05:00 UTC. A Vercel envia o
`CRON_SECRET` automaticamente no cabeçalho de autorização.

### 6. Teste final

Em uma janela anônima:

1. abra `/demo` e entre sem informar e-mail ou senha;
2. crie um agendamento;
3. tente editar preço, excluir cliente e mudar configurações — deve falhar;
4. saia e confirme que voltou para a página inicial;
5. confira no dia seguinte se o cron restaurou os dados fictícios.

Só divulgue a demo depois desses testes.

## Se a demo ainda não existir

Para uma instalação nova, não há cadastro manual. Depois do merge e da migration:

1. configure as variáveis no `.env.local`;
2. escolha e-mail e slug que nunca foram usados;
3. execute `npm run demo:provision`;
4. configure as mesmas variáveis na Vercel e faça o deploy.

O provisionador cria e registra a conta automaticamente. Por segurança, ele não
adota uma conta ou slug preexistente e não altera a senha de uma conta existente.

## O que a correção protege

- preços, equipe, configurações, financeiro e dados estruturais são somente leitura;
- senha, e-mail, telefone, metadados, MFA e identidades da conta demo ficam travados;
- somente a barbearia explicitamente registrada pode ser resetada;
- checkout Stripe, portal de cobrança e upload de imagens são bloqueados na demo;
- o login só envia a sessão ao navegador depois de validar a identidade demo;
- o botão Sair encerra somente a sessão daquele navegador.

## Limite conhecido

A conta continua sendo compartilhada. Uma chamada direta ao logout global do
Supabase pode invalidar outras sessões, embora o botão do sistema use logout local.
Não habilite passkeys ou outros provedores de login nessa conta sem nova revisão.
Use somente dados fictícios e considere proteção/rate limit na borda antes de uma
divulgação em grande volume.

Referências: [Supabase Auth](https://supabase.com/docs/guides/auth/managing-user-data),
[logout local](https://supabase.com/docs/guides/auth/signout),
[Vercel Cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
