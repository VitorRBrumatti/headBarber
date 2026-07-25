# Adicionais por barbeiro

**Data:** 2026-07-25  
**Status:** Aprovado para planejamento  
**Escopo:** banco de dados, painel de adicionais, catálogo público, disponibilidade, confirmação de reserva e testes

## Objetivo

Permitir que cada barbeiro ofereça um mesmo adicional com preço e duração próprios, ou deixe de oferecê-lo. A combinação entre barbeiro e adicional passa a ser a fonte de verdade para novos agendamentos, seguindo o modelo já adotado em `barber_services`.

O preço e a duração escolhidos devem ser preservados no histórico. A duração dos adicionais deve participar tanto da consulta de horários quanto do término efetivo do atendimento.

## Decisões aprovadas

- Criar uma relação dedicada `barber_add_ons`.
- Manter `add_ons` como catálogo global de nome e status.
- Configurar disponibilidade, preço e duração por barbeiro.
- Vincular adicionais existentes a todos os barbeiros existentes da mesma barbearia, copiando preço e duração atuais.
- Exigir ao menos um barbeiro disponível ao criar um adicional novo.
- Permitir que um adicional existente fique sem barbeiros disponíveis.
- Não vincular automaticamente adicionais a barbeiros criados futuramente.
- Exibir ao cliente somente adicionais disponíveis para o barbeiro selecionado.
- Somar a duração dos adicionais à duração do serviço para consultar horários e criar a reserva.
- Preservar preço e duração de cada adicional como snapshots no agendamento.

## Modelo de dados

### `barber_add_ons`

| Coluna | Regra |
| --- | --- |
| `id` | UUID, chave primária |
| `barbershop_id` | UUID obrigatório, referência à barbearia |
| `barber_id` | UUID obrigatório, referência ao barbeiro |
| `add_on_id` | UUID obrigatório, referência ao adicional |
| `price` | `numeric(10,2)`, obrigatório e maior ou igual a zero |
| `duration_minutes` | inteiro obrigatório, entre 0 e 720 minutos |
| `is_available` | booleano obrigatório |
| `configuration_version` | bigint obrigatório, iniciado em 1 |
| `created_at` | timestamp UTC |
| `updated_at` | timestamp UTC |

Regras estruturais:

- unicidade por `(barber_id, add_on_id)`;
- barbeiro, adicional e vínculo devem pertencer à mesma barbearia;
- índices para consultas por barbearia, barbeiro, adicional e disponibilidade;
- `configuration_version` aumenta somente quando preço, duração ou disponibilidade mudarem;
- vínculos usados por histórico não são apagados ao serem desmarcados; ficam indisponíveis.

### `add_ons`

`add_ons` continua responsável por nome, status global e barbearia. As colunas globais `price` e `duration_minutes` permanecem temporariamente para compatibilidade durante a expansão, mas deixam de ser fonte de verdade para código novo. A operação administrativa mantém nelas um valor compatível até uma futura migração de limpeza.

### `appointment_add_ons`

Adicionar:

- `barber_add_on_id`, referência ao vínculo selecionado;
- `duration_minutes`, snapshot da duração extra;
- manter `price` como snapshot de preço.

Para agendamentos históricos, `duration_minutes` será preenchido com zero, porque o fluxo antigo não incluía a duração dos adicionais em `end_at`. A migração não altera horários já reservados. Novos agendamentos gravam vínculo, preço e duração reais.

## Migração e compatibilidade

1. Criar `barber_add_ons`, constraints, índices, grants, RLS e políticas.
2. Criar um vínculo para cada par adicional–barbeiro da mesma barbearia, copiando preço e duração globais e marcando-o disponível.
3. Adicionar os snapshots novos em `appointment_add_ons` inicialmente anuláveis.
4. Relacionar snapshots históricos ao vínculo do barbeiro do agendamento quando a relação correspondente existir.
5. Preencher duração histórica com zero e preservar `end_at`.
6. Adaptar RPCs em uma fase de expansão compatível, sem remover imediatamente assinaturas ou colunas antigas.
7. Migrar todos os consumidores para os vínculos novos.
8. Contrair somente em migração posterior, depois de verificar ausência de dados nulos e consumidores legados.

Se houver dado histórico sem relação válida dentro da mesma barbearia, a migração deve falhar com diagnóstico explícito; não pode cruzar tenants nem inventar pertencimento.

## Segurança

`barber_add_ons` fica no schema exposto `public`, com RLS habilitada.

- `anon` pode ler somente vínculos disponíveis cujos barbeiro e adicional estejam ativos.
- `authenticated` administra somente vínculos da própria barbearia.
- Políticas de atualização usam `USING` e `WITH CHECK`.
- O cliente nunca fornece preço ou duração como fonte de verdade.
- RPCs transacionais qualificam schemas, usam `search_path = ''`, validam autenticação ou tenant conforme o caso e têm execução concedida apenas às roles necessárias.
- Toda confirmação pública revalida barbearia, barbeiro, adicional, disponibilidade e versão dentro da transação.

## Painel administrativo

O formulário de adicional passa a conter:

- nome;
- status global;
- lista de barbeiros;
- disponibilidade por barbeiro;
- preço por barbeiro;
- duração extra por barbeiro.

Na criação, ao menos um vínculo precisa estar disponível. Na edição, todos podem ser desativados. Preço aceita zero; duração aceita zero e deve ser inteira, até 720 minutos.

O salvamento do adicional e dos vínculos é atômico por meio de uma operação transacional. IDs duplicados, barbeiros externos à barbearia e valores inválidos são rejeitados no TypeScript e no banco.

Os cards do painel mostram:

- status global;
- quantidade de profissionais disponíveis;
- preço único ou faixa de preço;
- duração única ou faixa de duração.

## Fluxo público

As etapas permanecem:

1. Profissional
2. Serviço
3. Adicionais
4. Produtos
5. Data e hora
6. Dados do cliente
7. Confirmação

Depois de escolher o barbeiro, a aplicação carrega seus serviços e seus adicionais disponíveis. A etapa de adicionais usa os vínculos `barber_add_ons`, exibindo nome, preço e duração próprios daquele profissional.

Ao trocar de barbeiro, o sistema limpa:

- serviço;
- adicionais selecionados;
- data e horário;
- slots;
- erros dependentes dessas escolhas.

Produtos podem permanecer, pois não dependem do barbeiro. Respostas atrasadas do barbeiro anterior não podem substituir o catálogo atual.

## Horários e duração

A consulta de slots recebe o vínculo do serviço e os vínculos dos adicionais selecionados, com suas versões. O banco valida que todos pertencem ao mesmo barbeiro e à mesma barbearia.

A duração total do atendimento é:

`duração do serviço + soma das durações dos adicionais`

Somente são retornados horários em que o intervalo completo:

- termina dentro do expediente;
- não cruza almoço;
- não cruza bloqueio;
- não sobrepõe outro agendamento ativo.

Alterar a seleção de adicionais depois de carregar horários limpa data e horário e exige nova consulta, porque a duração total pode ter mudado.

## Confirmação da reserva

A criação pública recebe identificadores e versões, nunca valores monetários ou durações. Dentro da mesma transação, o banco:

1. bloqueia e relê o vínculo do serviço;
2. valida e relê todos os vínculos de adicionais;
3. rejeita duplicidades e relações de outro barbeiro ou tenant;
4. compara versões e disponibilidade;
5. calcula preço total e duração total;
6. valida novamente o intervalo;
7. cria o agendamento e os snapshots dos adicionais;
8. retorna o comprovante autoritativo.

Se preço, duração ou disponibilidade mudarem durante o fluxo, a operação retorna `CONFIG_CHANGED` sem criar a reserva. A interface volta à etapa de adicionais, recarrega o catálogo e limpa o horário. Um vínculo inválido ou desativado retorna erro estável equivalente e também não cria dados parciais.

`appointments.end_at` passa a refletir serviço mais adicionais. `appointments.total_price` continua sendo serviço mais adicionais. Produtos mantêm a regra financeira atual e seus snapshots próprios.

## APIs e componentes

- `getBookingPageData` deixa de carregar adicionais globais.
- Uma Server Action carrega os `barber_add_ons` do barbeiro selecionado.
- Os tipos públicos usam o ID e a versão do vínculo.
- `getPublicSlotsAction` inclui os vínculos de adicionais selecionados.
- `createPublicBooking` envia os vínculos e versões selecionados.
- O painel ganha tipos, validação e editor de atribuições equivalentes aos de serviços, sem compartilhar código prematuramente se isso tornar as regras menos claras.
- Uma RPC autenticada salva catálogo e vínculos de forma transacional.

## Tratamento de erros

- Falha ao carregar adicionais oferece nova tentativa ou troca de barbeiro.
- Catálogo vazio informa que o profissional não possui adicionais, sem bloquear o avanço.
- Alteração de seleção invalida horários previamente carregados.
- `CONFIG_CHANGED` recarrega preços e durações antes de nova confirmação.
- Erros de tenant, duplicidade e IDs inexistentes são rejeitados no servidor e no banco.
- Nenhum erro esperado deixa cadastro ou reserva parcialmente gravados.

## Estratégia de testes

### Banco e migração

- criação, constraints, índices, grants e RLS de `barber_add_ons`;
- backfill sem cruzar barbearias;
- vínculo único por barbeiro e adicional;
- leitura anônima somente de vínculos publicáveis;
- escrita autenticada somente no próprio tenant;
- salvamento atômico do adicional e vínculos;
- versões alteradas somente por mudança relevante;
- snapshots de preço e duração;
- históricos preservados com duração zero e `end_at` inalterado;
- slots usando serviço mais adicionais;
- rejeição de vínculo inválido, duplicado, indisponível ou desatualizado;
- concorrência e sobreposição com a duração total.

### Unidade e interface

- validação do formulário;
- faixas de preço e duração nos cards;
- filtro de adicionais por barbeiro;
- troca de barbeiro limpando adicionais e agenda;
- alteração de adicionais limpando data e horário;
- totais usando preços dos vínculos;
- proteção contra resposta assíncrona obsoleta;
- estados vazio, carregando e erro.

### Integração e ponta a ponta

- administrador configura o mesmo adicional com valores diferentes para dois barbeiros;
- cliente vê somente o adicional e o preço do barbeiro escolhido;
- duração extra reduz corretamente os horários disponíveis;
- confirmação grava vínculo e snapshots corretos;
- mudança de configuração durante o fluxo exige nova seleção;
- histórico preserva valores após edição do catálogo.

## Critérios de aceite

- O mesmo adicional aceita preço, duração e disponibilidade diferentes por barbeiro.
- O painel salva catálogo e vínculos atomicamente.
- Dados atuais permanecem disponíveis após o backfill.
- O cliente vê somente adicionais do barbeiro escolhido.
- Trocar barbeiro remove adicionais e horários incompatíveis.
- Alterar adicionais exige recalcular horários.
- Slots e `end_at` consideram a duração total.
- O banco ignora valores manipulados pelo cliente.
- A reserva registra preço e duração históricos.
- RLS, testes de banco, testes unitários, ponta a ponta, lint e build passam.

## Fora de escopo

- Adicionais diferentes por serviço.
- Preços por data, horário, promoção ou cliente.
- Quantidade maior que um para o mesmo adicional.
- Vincular automaticamente adicionais a barbeiros criados no futuro.
- Alterar a regra financeira dos produtos.
