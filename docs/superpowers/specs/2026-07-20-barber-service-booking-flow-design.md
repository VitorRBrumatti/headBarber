# Fluxo de agendamento por barbeiro e serviço

**Data:** 2026-07-20  
**Status:** Aprovado para planejamento  
**Escopo:** banco de dados, fluxo público de agendamento, Server Actions, painel administrativo, agenda, reservas e testes

## Objetivo

Alterar o agendamento público para que o cliente escolha primeiro um barbeiro e depois veja somente os serviços oferecidos por esse profissional. Preço, duração e disponibilidade passam a pertencer à combinação entre barbeiro e serviço.

O sistema deve usar essa combinação como fonte de verdade na consulta pública, na disponibilidade de horários, na confirmação, no registro do agendamento e nas telas administrativas. Uma mudança posterior de preço ou duração não pode alterar o histórico de um agendamento já criado.

## Decisões aprovadas

- Usar uma tabela de relação dedicada, `barber_services`.
- Manter `services` como catálogo de nome, descrição e status global.
- Tornar `barber_services` a única fonte válida de preço, duração e disponibilidade para novos agendamentos.
- Preencher a relação na migração vinculando todos os serviços existentes a todos os barbeiros existentes da mesma barbearia, copiando preço e duração atuais.
- Exigir seleção explícita de barbeiros ao criar novos serviços.
- Iniciar barbeiros novos sem serviços vinculados.
- Remover a opção pública “qualquer profissional”.
- Preservar preço e duração escolhidos como snapshots no agendamento.

## Modelo de dados

### `barber_services`

A nova tabela contém:

| Coluna | Regra |
| --- | --- |
| `id` | UUID, chave primária |
| `barbershop_id` | UUID obrigatório, referência à barbearia |
| `barber_id` | UUID obrigatório, referência ao barbeiro |
| `service_id` | UUID obrigatório, referência ao serviço |
| `price` | `numeric(10,2)`, obrigatório, maior ou igual a zero |
| `duration_minutes` | inteiro obrigatório, entre 5 e 720 minutos |
| `is_available` | booleano obrigatório, padrão `true` |
| `created_at` | timestamp UTC |
| `updated_at` | timestamp UTC |
| `configuration_version` | bigint obrigatório, inicia em 1 e é incrementado somente quando preço, duração ou disponibilidade mudarem |

Restrições e índices:

- unicidade por `(barber_id, service_id)`;
- consistência de tenant: barbeiro, serviço e vínculo precisam pertencer à mesma barbearia;
- índices por `barbershop_id`, `barber_id`, `service_id` e consulta de vínculos disponíveis;
- exclusão de barbeiro ou serviço não deve apagar dados necessários a agendamentos históricos. O comportamento de chaves estrangeiras deve respeitar as restrições já existentes em `appointments`.

### `services`

`services` permanece responsável por:

- nome;
- descrição;
- status global `is_active`;
- vínculo com a barbearia.

As colunas globais de preço e duração deixam de participar de qualquer leitura ou cálculo do agendamento. A migração pode removê-las depois que os valores forem copiados e todos os consumidores forem alterados, eliminando a possibilidade de duas fontes de verdade.

### `appointments`

Adicionar:

- `barber_service_id`, referência à combinação selecionada;
- `service_price`, snapshot do preço do serviço no momento da criação;
- `service_duration_minutes`, snapshot da duração no momento da criação.

`barber_id` e `service_id` permanecem para consultas diretas e compatibilidade com relatórios existentes. O banco garante a coerência estrutural com uma chave estrangeira composta de `(barber_service_id, barbershop_id, barber_id, service_id)` para a chave única equivalente em `barber_services`.

`total_price` continua representando o valor total do atendimento segundo a regra atual: serviço mais adicionais. Produtos reservados continuam com seus próprios snapshots em `appointment_products` e não entram no valor do atendimento enquanto forem pagos na retirada.

Nomes de barbeiro e serviço não serão snapshots nesta entrega: telas históricas exibem os nomes atuais do cadastro. Esta é uma decisão explícita; histórico documental de nomes poderá ser adicionado em uma evolução separada.

### Migração e implantação em fases

A implantação é dividida em releases independentes. Nenhuma release pode aplicar simultaneamente expansão e contração.

#### Fase 1 — Expandir

1. Criar `barber_services`, constraints compostas, índices, RLS e políticas.
2. Inserir uma relação para cada par de barbeiro e serviço da mesma barbearia, copiando preço e duração atuais, com `is_available = true`.
3. Adicionar `barber_service_id`, `service_price` e `service_duration_minutes` como colunas anuláveis em `appointments`.
4. Executar pré-validações e interromper a migração se houver: agendamento sem relação correspondente, preço reconstruído negativo, `end_at <= start_at` ou duração fora de 5 a 720 minutos. Nenhuma anomalia será convertida silenciosamente para zero.
5. Fazer o backfill somente depois dessas validações. O preço histórico é `total_price` menos os snapshots de adicionais; a duração é derivada de `end_at - start_at`.
6. Criar as novas funções e adaptar as assinaturas antigas para também validar `barber_services` e preencher snapshots, mantendo-as executáveis para clientes antigos.
7. Manter `services.price` e `services.duration_minutes`; a operação administrativa grava nelas o primeiro vínculo disponível ordenado por `barber_id`, somente para compatibilidade. Nenhum código novo usa esses campos para cálculo.
8. Registrar chamadas das RPCs legadas em uma tabela no schema `private`, permitindo medir clientes antigos sem expor telemetria pelo Data API.

#### Fase 2 — Migrar a aplicação

1. Publicar Server Actions e interfaces novas usando as RPCs e relações novas.
2. Fazer todos os novos agendamentos preencherem relação e snapshots.
3. Auditar por busca e teste todos os `INSERT` e `UPDATE` de `appointments`. Qualquer operação que crie ou volte a bloquear um intervalo deve usar o mesmo lock e as mesmas validações de expediente, almoço, bloqueios e sobreposição.
4. Monitorar snapshots nulos e chamadas das RPCs legadas por pelo menos 14 dias consecutivos.

#### Fase 3 — Contrair em release separada

Somente após 14 dias sem chamadas legadas e com contagem zero de snapshots nulos:

1. Aplicar `NOT NULL` aos três campos novos.
2. Revogar/remover as assinaturas antigas.
3. Remover a telemetria privada de compatibilidade quando não for mais necessária.
4. Manter as colunas globais de `services` por mais um ciclo de release.

#### Fase 4 — Limpeza futura

Após confirmar por busca de código, logs e testes que nenhum consumidor lê as colunas globais, criar uma migração separada para remover `services.price` e `services.duration_minutes`. Essa limpeza é obrigatória para encerrar a transição, mas não acompanha o deploy inicial.

A migração deve ser idempotente apenas onde isso for compatível com o padrão do repositório; o arquivo versionado será a fonte de histórico.
## Segurança e acesso

`barber_services` fica no schema exposto `public`, portanto RLS deve ser habilitada.

### Público anônimo

Pode ler somente vínculos que simultaneamente:

- estejam disponíveis;
- pertençam à barbearia consultada;
- referenciem barbeiro ativo;
- referenciem serviço ativo.

Não pode inserir, atualizar ou apagar vínculos.

### Usuário autenticado

Pode administrar somente vínculos da própria barbearia, verificada pelo perfil autenticado. Políticas de atualização devem usar `USING` e `WITH CHECK`, com política de leitura correspondente.

### Funções públicas

As funções transacionais públicas existentes usam `SECURITY DEFINER`. As versões novas devem:

- definir `search_path = ''`;
- qualificar todas as relações com schema;
- validar explicitamente barbearia, barbeiro, serviço e vínculo;
- revogar execução de `PUBLIC` e conceder somente às funções/roles necessárias;
- manter funções internas no schema não exposto `private`, com `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`; somente o wrapper público explicitamente concedido pode acioná-las;
- nunca aceitar preço ou duração fornecidos pelo cliente como fonte de verdade.

## Fluxo público

As sete etapas passam a ser:

1. Profissional
2. Serviço
3. Adicionais
4. Produtos
5. Data e hora
6. Dados do cliente
7. Confirmação

### Seleção de profissional

A primeira etapa lista somente barbeiros ativos da barbearia. A opção “qualquer profissional” é removida porque não existe preço determinístico antes da escolha concreta.

Ao selecionar um barbeiro, o cliente inicia uma consulta que retorna somente os vínculos disponíveis daquele profissional, incluindo os dados do catálogo necessários à exibição, o preço/duração do vínculo e o `configuration_version` vigente.

### Seleção de serviço

Cada cartão exibe:

- nome e descrição do serviço;
- preço cobrado pelo barbeiro selecionado;
- duração configurada para a combinação.

Durante a consulta há estado de carregamento. Falha de consulta oferece nova tentativa ou retorno à escolha do profissional. Lista vazia informa que o barbeiro não possui serviços disponíveis e oferece troca de profissional.

### Troca de barbeiro

Quando o barbeiro muda, o sistema limpa imediatamente:

- serviço selecionado;
- data selecionada;
- horário selecionado;
- slots carregados;
- erros dependentes dessas escolhas.

Depois busca novamente os serviços e preços do novo barbeiro. Respostas atrasadas de uma seleção anterior não podem sobrescrever a lista atual. Adicionais e produtos podem permanecer porque não dependem do barbeiro.

### Horários

A consulta de slots recebe a combinação barbeiro-serviço, ou identificadores equivalentes validados no servidor. Ela usa `duration_minutes` do vínculo e só retorna horários de início em que o atendimento completo:

- termina dentro do expediente;
- não cruza almoço;
- não cruza bloqueio excepcional;
- não sobrepõe outro agendamento ativo.

O intervalo entre possíveis horários de início continua vindo das configurações da barbearia; ele não substitui a duração real do atendimento. A nova função preserva a semântica temporal existente em UTC e o filtro de `America/Sao_Paulo`; altera somente a origem do barbeiro/duração e a verificação do intervalo completo. Casos próximos à meia-noite recebem testes de regressão próprios.

### Confirmação

Antes de inserir, o banco relê e bloqueia os dados necessários, confirma que o vínculo ainda está disponível e compara `configuration_version`. Essa versão só muda quando preço, duração ou disponibilidade mudam; salvamentos idênticos não invalidam fluxos em andamento. Preço e duração continuam vindo exclusivamente do banco.

Se o vínculo tiver sido desativado, a resposta orienta a interface a voltar para Serviço, limpar data/horário e recarregar a lista. Se preço ou duração tiverem mudado desde a seleção, a transação retorna `CONFIG_CHANGED` sem criar o agendamento; a interface recarrega a configuração e pede uma nova confirmação.

Quando a criação é concluída, a RPC retorna um comprovante autoritativo com IDs e nomes, snapshots de preço/duração, totais de adicionais e produtos, total do atendimento, total a pagar, início e fim. A tela de sucesso usa exclusivamente esse comprovante, não o estado anterior do navegador.

## Painel administrativo

### Página de serviços

A página continua sendo o ponto principal de gestão do catálogo.

O formulário de criação/edição contém:

- nome;
- descrição;
- status global;
- lista de barbeiros da barbearia;
- controle de disponibilidade por barbeiro;
- preço por barbeiro;
- duração por barbeiro.

Um novo serviço exige:

- nome válido;
- ao menos um barbeiro explicitamente selecionado;
- preço numérico maior ou igual a zero em todo vínculo disponível;
- duração inteira entre 5 e 720 minutos em todo vínculo disponível.

Na criação, ao menos um vínculo precisa estar disponível. Na edição de serviço existente, todos os vínculos podem ser desativados; o serviço pode permanecer globalmente ativo, mas não aparece no agendamento público. TypeScript e SQL aplicam exatamente essa mesma regra.

Ao desmarcar um barbeiro, o vínculo é mantido com `is_available = false`, em vez de ser apagado. Isso preserva referências históricas e permite reativação sem recriação.

O salvamento do serviço e dos vínculos deve ser transacional. A operação não pode deixar um serviço criado parcialmente se algum vínculo for inválido.

Os cartões de serviço passam a mostrar:

- status global;
- quantidade de profissionais disponíveis;
- faixa de preço, ou preço único quando todos forem iguais;
- faixa de duração, quando houver variação.

### Página de barbeiros

Barbeiros novos não recebem serviços automaticamente. A interface pode exibir a quantidade de serviços configurados e um acesso à gestão na página de Serviços, sem duplicar a edição em dois lugares.

## Resumo, sucesso e detalhes administrativos

Todas as visualizações relevantes devem distinguir:

- barbeiro;
- serviço;
- preço do serviço selecionado;
- duração;
- adicionais e seus valores;
- produtos reservados e subtotal;
- total do atendimento;
- total geral apresentado ao cliente quando aplicável.

O resumo durante o agendamento usa os dados do vínculo carregado. A tela de sucesso e os detalhes administrativos usam os snapshots do agendamento, nunca o preço atual da relação.

Agenda e Reservas devem continuar fazendo join com barbeiro e serviço para nomes, mas usar `appointments.service_price`, `appointments.service_duration_minutes` e `appointments.total_price` para valores históricos.

## APIs e limites de responsabilidade

### Consulta pública de catálogo

`getBookingPageData` deixa de carregar todos os serviços globais. Carrega barbearia, barbeiros, adicionais e produtos.

Uma Server Action pública específica consulta os serviços do barbeiro selecionado. Ela filtra explicitamente por barbearia, barbeiro, vínculo disponível e registros ativos, mesmo com RLS, para permitir um plano de consulta eficiente e defesa em profundidade.

### Consulta pública de horários

`getPublicSlotsAction` deixa de aceitar “any” e passa a exigir barbeiro e serviço/vínculo. A função valida que a combinação pertence à barbearia antes de consultar slots.

### Criação pública

`createPublicBooking` exige barbeiro e serviço concretos. A função transacional calcula preço, duração, `end_at` e snapshots no banco. O wrapper de produtos continua chamando a operação central dentro da mesma transação.

### Administração

As Server Actions autenticadas validam os campos antes de chamar uma operação transacional de persistência do catálogo e vínculos. A função administrativa usa o contexto autenticado/RLS e não confia apenas em um `barbershop_id` enviado pela interface.

## Validação e mensagens de erro

### Interface

- Profissional é obrigatório antes do serviço.
- Serviço precisa pertencer à lista do profissional atual.
- Preço aceita zero, mas não aceita valor negativo, vazio ou não numérico em vínculo disponível.
- Duração deve estar entre 5 e 720 minutos e ser compatível com as opções apresentadas.
- Trocar profissional invalida serviço, data e horário.
- Não é possível avançar enquanto uma consulta obrigatória está carregando ou falhou.

### Servidor

- Repetir validações de tipos, limites e pertencimento ao tenant.
- Rejeitar IDs duplicados e barbeiros externos à barbearia no formulário administrativo.
- Não aceitar serviço que não pertença ao barbeiro informado.
- Mapear erros esperados para códigos estáveis, como vínculo indisponível, conflito de horário e estoque insuficiente.

### Banco

- Constraints protegem preço, duração e unicidade.
- A transação valida status global e disponibilidade do vínculo.
- O bloqueio contra concorrência continua serializando reservas conflitantes do mesmo barbeiro.
- A sobreposição considera a duração real do serviço.

## Estratégia de testes

### Migração e banco

- estrutura, constraints, índices, grants e RLS de `barber_services`;
- preenchimento inicial sem cruzar tenants;
- vínculo único por barbeiro/serviço;
- leitura anônima apenas de vínculos publicáveis;
- escrita autenticada apenas na própria barbearia;
- manutenção compatível das funções antigas na expansão e revogação somente na contração;
- snapshots de preço/duração;
- criação rejeitada para combinação inválida ou indisponível;
- cálculo de `end_at` e total a partir do vínculo;
- slots que comportam a duração completa;
- concorrência e conflito de agenda;
- testes comportamentais reais no Postgres local para preço por vínculo, RLS entre tenants, almoço, bloqueios, duração de 45 minutos, CONFIG_CHANGED, snapshots e duas reservas simultâneas;
- testes de timezone próximos à meia-noite preservando a semântica UTC já usada pela aplicação.

### Unidade e componentes

- ordem das etapas;
- carregamento e filtro por barbeiro;
- troca de barbeiro limpando dependências;
- proteção contra resposta assíncrona obsoleta;
- estados vazio, carregando e erro;
- totais usando preço do vínculo;
- validação do formulário administrativo;
- faixa de preço/duração nos cartões;
- regressão de adicionais e produtos.

### Integração e ponta a ponta

- administrador cria serviço, escolhe barbeiros e define valores diferentes;
- cliente escolhe cada barbeiro e vê apenas seus serviços e preços;
- troca de barbeiro remove o serviço anterior;
- confirmação registra snapshots corretos;
- agenda e reservas exibem profissional, serviço e valores históricos;
- o E2E cria a reserva, valida o comprovante, abre o painel, altera o preço atual e confirma que o agendamento antigo mantém o snapshot;
- desativação de vínculo durante o fluxo produz recuperação segura.

## Critérios de aceite

- O primeiro passo do agendamento é a escolha de um barbeiro concreto.
- Somente serviços disponíveis para esse barbeiro são exibidos.
- O mesmo serviço pode ter preço e duração diferentes por barbeiro.
- Trocar o barbeiro remove o serviço anterior e recarrega catálogo e preço.
- Slots e término do agendamento respeitam a duração da combinação.
- O banco ignora qualquer preço/duração manipulados pelo cliente.
- O agendamento registra vínculo e snapshots corretos.
- O painel permite configurar disponibilidade, preço e duração por barbeiro.
- Dados existentes continuam agendáveis após o preenchimento inicial.
- Resumo, sucesso, agenda e reservas mostram barbeiro, serviço e preços corretos.
- Testes, lint e build passam; migrações, RPCs, concorrência e políticas são obrigatoriamente verificadas contra Supabase local antes de declarar conclusão.

## Fora de escopo

- Preços por dia, horário, unidade ou promoção.
- Duração variável por cliente.
- Pacotes com múltiplos serviços no mesmo agendamento.
- Reintrodução de “qualquer profissional” com cálculo de menor preço ou escolha automática.
- Alteração da regra financeira de produtos pagos na retirada.
