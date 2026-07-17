# Refatoração visual da tela de Configurações

## Objetivo

Refatorar exclusivamente o conteúdo visual da rota de Configurações para aproximá-lo dos dois protótipos fornecidos, preservando integralmente o shell atual do dashboard, a sidebar, os dados, as regras de negócio e os fluxos existentes.

## Escopo

A mudança abrange somente `src/app/dashboard/configuracoes/configuracoes-client.tsx` e, se necessário para estilos locais, um arquivo de estilos colocado junto ao componente. O componente servidor, as actions, as consultas ao Supabase e os componentes estruturais do dashboard não serão alterados.

## Direção visual

A tela usará a linguagem visual clara e premium definida no design system do projeto:

- fundo off-white na área de conteúdo;
- superfícies brancas com bordas cinza discretas e sombras difusas;
- texto principal em grafite, texto secundário em cinza e dourado reservado para ações e estados ativos;
- Montserrat para títulos e Inter para textos, labels e controles, conforme a configuração global existente;
- cantos de 8 a 12 px e espaçamento baseado no ritmo de 8 px;
- ícones Lucide já instalados no projeto, com peso e tamanho consistentes.

Não haverá alteração ou duplicação da sidebar, do cabeçalho global ou do shell do dashboard.

## Estrutura da página

### Cabeçalho e navegação

O conteúdo iniciará com o título `Configurações` e uma descrição curta sobre regras de agenda, horários e bloqueios. Abaixo, duas abas horizontais usarão sublinhado dourado e texto grafite para indicar a aba ativa:

- `Agenda & Horários`;
- `Bloqueios Excepcionais`.

A troca de abas continuará sendo controlada pelo estado local existente e limpará as mensagens de feedback, como ocorre hoje.

### Agenda e horários de funcionamento

Em telas grandes, o conteúdo será dividido em dois cartões lado a lado. Em telas menores, os cartões serão empilhados.

O cartão `Regras de Agendamento` conterá:

- intervalo dos slots;
- antecedência do lembrete por WhatsApp;
- textos auxiliares existentes.

O cartão `Horários de Funcionamento` conterá:

- início e término do expediente;
- início e término do almoço;
- separação visual entre expediente e almoço.

O botão `Salvar configurações` ficará em uma barra de ação inferior alinhada à direita. Seu estado de carregamento continuará visível durante o salvamento.

### Bloqueios excepcionais

Em telas grandes, a seção usará uma divisão assimétrica: formulário à esquerda e lista de bloqueios à direita. Em telas menores, os dois painéis serão empilhados.

O formulário manterá os campos atuais:

- seleção do barbeiro;
- início do bloqueio;
- fim do bloqueio;
- motivo;
- botão de criação com estado de carregamento.

A lista continuará exibindo apenas os bloqueios do barbeiro selecionado. Cada item apresentará motivo, intervalo formatado e ação de exclusão. Os estados de seleção ausente, carregamento e lista vazia serão mantidos, mas receberão a mesma linguagem visual clara do protótipo.

## Comportamento preservado

Nenhuma mudança funcional será feita. Permanecem inalterados:

- carregamento inicial das configurações;
- salvamento por `updateBarbershopSettingsAction`;
- criação por `createBarberBlock`;
- busca de bloqueios por `getBarberBlocks` após a seleção do barbeiro;
- exclusão por `deleteBarberBlock`;
- validações e mensagens existentes;
- conversão de datas para ISO;
- formatação das datas exibidas;
- permissões, autenticação e integração com Supabase.

## Acessibilidade e responsividade

- As abas serão implementadas com semântica adequada e estado ativo identificável.
- Inputs e botões manterão labels, foco visível e alvos confortáveis para toque.
- Mensagens de sucesso e erro serão visualmente distinguíveis e continuarão associadas ao fluxo correspondente.
- O layout não produzirá rolagem horizontal em viewports móveis.
- Grids de horário poderão permanecer em duas colunas quando houver largura suficiente e serão empilhados quando necessário.

## Estratégia de implementação

O componente cliente existente continuará sendo a fronteira interativa. A refatoração reorganizará apenas o JSX e as classes Tailwind, reutilizando os componentes e ícones já instalados. Não será criada uma segunda fonte de verdade para estado e não serão adicionadas dependências.

## Verificação

A entrega será considerada concluída quando:

- lint e build passarem;
- as duas abas alternarem corretamente;
- o salvamento das configurações mantiver seu estado de carregamento e feedback;
- a seleção de barbeiro continuar carregando sua lista filtrada;
- criação e exclusão de bloqueios preservarem o fluxo atual;
- os estados vazio, carregando, sucesso e erro estiverem visualmente corretos;
- o layout for validado em desktop e mobile;
- a renderização final for comparada visualmente com os protótipos fornecidos.
