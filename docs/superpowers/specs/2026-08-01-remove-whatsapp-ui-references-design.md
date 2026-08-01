# Remoção das referências visuais ao WhatsApp

## Objetivo

A interface não deve afirmar ou sugerir que o HeadBarber envia mensagens, lembretes ou notificações por WhatsApp. A infraestrutura mock existente será preservada para possível ativação futura.

## Escopo visual

- Na landing page, substituir o card “Notificações WhatsApp” por “Assinaturas de clientes”, descrevendo planos e benefícios recorrentes já disponíveis no produto.
- No login, substituir a frase sobre notificações automáticas por uma mensagem genérica sobre organização da operação.
- No cadastro de clientes, alterar “Telefone / WhatsApp” para “Telefone”.
- Nas configurações, remover o controle e a descrição de lembrete por WhatsApp.

## Infraestrutura preservada

Permanecem sem alteração:

- `src/lib/whatsapp.ts` e seu comportamento mock;
- chamadas internas que registram confirmações e cancelamentos no mock;
- campos `whatsapp_confirmation_sent` e `whatsapp_reminder_hours`;
- actions e contratos de banco relacionados ao valor de antecedência.

Ao salvar as configurações, o valor existente de `whatsapp_reminder_hours` continuará sendo reenviado internamente, embora o controle não seja exibido. Assim, nenhuma configuração atual é apagada e uma futura reativação não exigirá recuperação de dados.

## Validação

- Renderizar as quatro superfícies afetadas e confirmar que nenhuma contém “WhatsApp” ou promessa de notificações automáticas.
- Confirmar que o mock e as chamadas internas continuam presentes.
- Executar testes unitários, lint dos arquivos alterados e build de produção.

## Fora de escopo

- Remover ou ativar integrações reais de mensageria.
- Alterar migrations, banco de dados ou contratos das actions.
- Modificar notificações de erro e sucesso exibidas dentro dos formulários.