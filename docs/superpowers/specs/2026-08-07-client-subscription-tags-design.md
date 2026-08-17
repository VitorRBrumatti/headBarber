# Tags de assinatura na tela de clientes

## Objetivo

Corrigir a classificação visual dos clientes para que a tag represente exclusivamente uma assinatura ativa e nunca seja inferida de observações, posição na lista ou qualquer outro dado indireto.

## Regra aprovada

- Cliente com `client_subscriptions.status = 'active'`: exibir o nome real do plano associado em `subscription_plans.name`.
- Cliente sem assinatura ativa, inclusive com assinatura pausada ou cancelada: exibir `Regular`.
- A heurística atual baseada em `client.notes` e no índice da linha será removida integralmente.

## Dados

A página de Clientes buscará, além dos clientes, somente as assinaturas ativas da mesma barbearia com o identificador do cliente e o nome do plano. No servidor, esses registros serão transformados em um mapa `clientId → planName` e passados ao componente da listagem.

A regra continuará protegida pelo escopo da barbearia e pelas políticas existentes do Supabase. A interface não fará novas consultas por linha.

## Apresentação

- A tag de plano manterá o tratamento premium grafite e dourado já usado na lista.
- A tag `Regular` manterá o tratamento neutro existente.
- Nomes de plano longos terão largura máxima e reticências.
- O nome completo ficará disponível por tooltip nativo tanto ao passar o mouse quanto ao focar a tag pelo teclado.
- A aparência do avatar acompanhará o estado real: premium para assinatura ativa e neutra para cliente regular.

## Estados de falha

Se a consulta de assinaturas falhar, a página deverá lançar o erro em vez de classificar assinantes incorretamente como regulares. Relações sem nome de plano também serão tratadas como dados inválidos, sem criar rótulos fictícios.

## Verificação

- Testar cliente com assinatura ativa e nome curto.
- Testar cliente com nome de plano longo e acesso ao texto completo.
- Testar cliente sem assinatura.
- Testar assinaturas pausadas e canceladas como `Regular`.
- Verificar que observações contendo a palavra “premium” não alteram a tag.
