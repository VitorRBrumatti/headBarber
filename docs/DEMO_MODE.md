# Modo demonstração

O ambiente demo usa uma conta compartilhada, mas a senha nunca é enviada ao
navegador. A entrada acontece pelo `POST /auth/demo`, usando variáveis privadas
do servidor.

## O que o visitante pode fazer

- visualizar Dashboard, Agenda, Clientes, Financeiro, Serviços e Barbeiros;
- criar um agendamento de teste;
- sair da sessão normalmente.

O banco bloqueia edição ou exclusão de dados, mudanças de preço, equipe,
configurações, financeiro e assinatura. Essa proteção não depende da interface.

## Correção de segurança

A migração `20260831170149_harden_demo_security.sql` adiciona um cadastro
`public.demo_accounts`, acessível somente ao servidor/service role. Existe no
máximo uma demo por projeto. Nenhum perfil antigo é cadastrado automaticamente.

- Um usuário comum não pode alterar `demo_mode` nem se vincular à barbearia demo.
- O login confere cadastro, perfil, barbearia, e-mail e ausência de cobrança real
  antes de autenticar. Só publica cookies depois de conferir o usuário retornado.
- Uma sessão real já aberta é preservada; use janela anônima para experimentar a demo.
- O reset exige a barbearia cadastrada, confere vínculos e recusa colisões com IDs
  de clientes reais. A restauração ocorre numa transação: falhas não deixam deleções parciais.
- Triggers no Auth bloqueiam senha, e-mail, telefone, metadados, recuperação,
  exclusão da conta, vinculação de identidades e cadastro de MFA da demo registrada.
  Datas de login continuam permitidas. Contas normais não recebem esse bloqueio.
- Checkout e portal Stripe recusam sessões demo mesmo por chamada direta.
- A demo não pode consumir a cota de envio de imagens para o provedor externo.
- O botão Sair encerra apenas a sessão atual.

## Preparação e Supabase

1. Mantenha a entrada demo desativada durante a preparação: não configure
   `DEMO_ACCOUNT_PASSWORD` na Vercel até concluir a validação em homologação.
   Se já estiver ativa, remova temporariamente a variável e faça redeploy.
2. Confirme o projeto Supabase de destino antes de executar qualquer comando.
   Confira as migrações e o dry-run:

   ```sh
   npx supabase migration list --linked
   npx supabase db push --dry-run --linked
   ```

3. Aplique as migrações pendentes **primeiro em homologação**. O comando abaixo
   altera o banco vinculado; revise a saída anterior antes de executá-lo:

   ```sh
   npx supabase db push --linked
   ```

   Não reedite/reaplique a migração antiga de demo. A correção é uma migração nova.

4. Configure `.env.local` com as variáveis da seção seguinte. Não comite esse arquivo.
5. Para uma demo nova, escolha e-mail e slug ainda não utilizados e execute:

   ```sh
   npm run demo:provision
   ```

   O script cria conta confirmada, barbearia, cadastro protegido, três serviços,
   dois barbeiros e poucos dados de exemplo. Ele **não adota contas existentes**,
   não troca senhas de contas existentes e não sobrescreve IDs de outro tenant.
   Execuções posteriores restauram a mesma demo registrada. A atividade de teste
   nessa barbearia será apagada/recriada.

### Se a demo antiga já foi criada

O script vai parar até haver revisão e cadastro explícito. No SQL Editor, confira
o UUID do usuário, UUID da barbearia, e-mail, slug e se TODOS os dados são fictícios:

```sql
select p.id as user_id, u.email, p.barbershop_id, b.name, b.slug,
       p.demo_mode, p.role, s.stripe_customer_id, s.stripe_subscription_id
from public.profiles p
join auth.users u on u.id = p.id
join public.barbershops b on b.id = p.barbershop_id
left join public.subscriptions s on s.user_id = p.id
where p.demo_mode = true;
```

Essa consulta só ajuda na revisão: a marcação antiga NÃO comprova que os dados são
descartáveis. Não registre uma barbearia com clientes reais. Verifique também que
não há outros usuários vinculados, cobrança Stripe ou fatores MFA.

Depois da revisão, substitua os dois placeholders pelos UUIDs exatos e execute
como administrador no SQL Editor. Isso autoriza resets destrutivos APENAS nessa
barbearia e trava as credenciais da conta:

```sql
insert into public.demo_accounts (user_id, barbershop_id)
values ('UUID_DO_USUARIO_DEMO', 'UUID_DA_BARBEARIA_DEMO');
```

Então execute `npm run demo:provision`. Não remova dados reais nem altere uma
assinatura real para fazer a validação passar. Se houver dúvida, pare e revise.
Falhas parciais no primeiro provisionamento também exigem revisão manual;
não há adoção automática na segunda tentativa.

## Variáveis e Vercel

Em **Project → Settings → Environment Variables**, configure os valores do
mesmo projeto Supabase. Preview/homologação deve usar um projeto separado de Production.

| Variável | Valor/origem |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon usada pelo cliente atual |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role; somente servidor |
| `DEMO_ACCOUNT_EMAIL` | E-mail exclusivo da conta demo cadastrada |
| `DEMO_ACCOUNT_PASSWORD` | Senha longa e aleatória, pelo menos 10 caracteres |
| `DEMO_BOOKING_SLUG` | Slug exclusivo, padrão `headbarber-demo` |
| `CRON_SECRET` | Segredo aleatório independente, gerado por você |

Mantenha também as variáveis já usadas pela aplicação, como `NEXT_PUBLIC_APP_URL`
e Stripe. Nunca coloque service role, senha demo ou cron secret em variáveis
`NEXT_PUBLIC_`, links ou mensagens para leads.

**CRON_SECRET não é fornecido pelo Supabase.** Gere um valor com seu gerenciador
de senhas (por exemplo, 32 bytes aleatórios), salve como `CRON_SECRET` na Vercel
e faça redeploy. A Vercel envia `Authorization: Bearer <CRON_SECRET>` ao endpoint.

O `vercel.json` agenda `/api/cron/reset-demo` diariamente às **05:00 UTC**
(02:00 em São Paulo). No plano Hobby, a execução pode ocorrer em qualquer momento
daquela hora. Crons da Vercel executam em deploys de Production, não em Preview.
O reset restaura atividade/clientes/financeiro; não altera a senha ou o catálogo.

Após configurar tudo e validar em homologação, aplique a migração e cadastre a demo
em produção, configure as variáveis Production e publique a branch aprovada via PR.
Nenhum deploy ou comando de produção faz parte dos testes unitários deste projeto.

## Checklist obrigatório antes de enviar aos leads

1. Abra `/demo` em janela anônima. Entre no painel sem informar credenciais.
2. Confira os dados fictícios e crie um agendamento; teste também o botão de cliente.
3. Confirme que editar preço, excluir cliente/barbeiro e mudar configurações falham.
4. Na conta demo, tente mudar senha/e-mail por `auth.updateUser` e cadastrar MFA:
   devem falhar. Faça isso em homologação, sem usar uma conta real.
5. Confira que login, renovação de sessão e logout funcionam; o logout pelo botão
   não deve desconectar uma segunda janela com outra sessão.
6. Tente o reset sem autorização: deve retornar 401. Com o segredo correto,
   deve retornar `{"ok":true,"reset":1}` e manter outra barbearia intacta.
7. Confira os logs do cron depois do primeiro ciclo em Production.

Os testes automatizados executam as duas migrações demo em PostgreSQL em memória,
com tabelas de teste, e verificam rotas com serviços simulados. Não substituem um
teste integrado com a versão do Supabase Auth hospedada no projeto. Os triggers
tocam tabelas gerenciadas pelo Auth; reteste após atualizações do Supabase.

Na validação desta correção, o build de produção e a suíte Vitest passaram.
O Supabase local/Docker estava desligado, portanto seu advisor e o fluxo Auth
completo continuam pendentes em homologação. O `tsc --noEmit` geral ainda aponta
erros anteriores nas fixtures de `agenda-grid-render.test.tsx` e
`dashboard-shell.test.ts`; esses arquivos não foram alterados por esta correção.

## Limites e manutenção

- A conta ainda é compartilhada: os visitantes veem a mesma agenda e os mesmos
  dados fictícios. Não peça telefone/e-mail reais nessa experiência.
- Uma chamada maliciosa direta ao logout global do Supabase ainda pode invalidar
  sessões de outros visitantes. O botão foi corrigido, mas isolamento total exige
  sessões/contas individuais ou uma demo sem tokens Auth compartilhados.
- Não habilite provedores/formas adicionais de login (como passkeys) para esta
  demo sem revisar seus caminhos de credenciais. As proteções testadas cobrem
  senha/e-mail, `auth.identities` e `auth.mfa_factors`.
- Rotação de senha da demo exige manutenção administrativa controlada: não basta
  alterar a variável ou executar o provisionador. O bloqueio alcança também a
  API administrativa do Auth enquanto a conta está registrada. Não remova o
  cadastro em uma demo ativa para contornar isso: revogue sessões e aguarde a
  expiração dos tokens antes de qualquer desbloqueio planejado.
- Considere limites de acesso na borda antes de divulgar amplamente; a conta
  compartilhada continua sujeita a abuso de agendamentos e limites do Auth.

Referências oficiais: [dados e triggers do Auth](https://supabase.com/docs/guides/auth/managing-user-data),
[escopo de logout](https://supabase.com/docs/guides/auth/signout),
[segurança do cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs),
[limites de cron](https://vercel.com/docs/cron-jobs/usage-and-pricing).
