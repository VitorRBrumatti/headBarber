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

## Configuração

1. Aplique as migrações do Supabase.
2. Configure as variáveis descritas em `.env.example`.
3. Execute `npm run demo:provision` uma vez para criar a conta e os dados leves.
4. Configure `CRON_SECRET` também no deploy. O `vercel.json` restaura a atividade
   demo diariamente às 05:00 UTC.

Use uma senha longa e aleatória em `DEMO_ACCOUNT_PASSWORD`. Ela é apenas uma
credencial interna e não deve ser compartilhada com leads.
