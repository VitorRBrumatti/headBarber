# Agenda em grade diária

## Objetivo

Reconstruir a Agenda do painel como uma grade diária por profissional, recuperando a praticidade da experiência anterior sem reverter a lógica atual de serviços por barbeiro, disponibilidade autoritativa, adicionais, produtos e transições de status.

## Escopo

- Exibir um único dia por vez.
- Mostrar os horários em linhas e os barbeiros ativos em colunas.
- Posicionar reservas na coluna do barbeiro e no intervalo correspondente.
- Abrir uma sidebar de criação ao clicar em um horário disponível.
- Abrir uma sidebar de detalhes ao clicar em uma reserva.
- Preservar as ações e consultas atuais de criação, disponibilidade e atualização de status.
- Adaptar a grade para telas menores com rolagem horizontal.

Não fazem parte deste trabalho uma visualização semanal ou mensal, arrastar reservas, redimensionar reservas, editar os itens financeiros de uma reserva existente ou mudar as regras de disponibilidade do backend.

## Direção visual

A tela seguirá o exemplo fornecido pelo usuário e a identidade clara atual da HeadBarber:

- cabeçalho com título, data por extenso, quantidade de reservas e navegação entre dias;
- grade branca com separadores discretos, coluna de horários fixa e cabeçalhos de profissionais;
- cartões de reserva compactos, legíveis e diferenciados por status;
- horários indisponíveis com tratamento visual neutro e sem ação de criação;
- acento dourado usado com moderação para horários disponíveis, foco e reservas confirmadas;
- tipografia, cores e componentes compatíveis com o restante do dashboard.

## Estrutura da tela

### Cabeçalho

O cabeçalho terá:

- título “Agenda”;
- data selecionada por extenso;
- resumo da quantidade de reservas do dia;
- botões de dia anterior, hoje e próximo dia;
- seletor nativo de data;
- botão “Nova reserva”.

Toda mudança de dia continuará usando o parâmetro `date` da rota atual.

### Grade

A grade terá uma primeira coluna para horários e uma coluna para cada barbeiro ativo. Os intervalos serão derivados da configuração vigente da barbearia. Quando essa informação não estiver disponível, será usado o intervalo seguro já adotado pelo produto.

Cada célula terá um dos seguintes estados:

- disponível: clicável e com indicação sutil ao passar o cursor;
- ocupada: contém uma reserva e abre seus detalhes;
- almoço, folga ou bloqueio: visualmente indisponível e sem ação de criação;
- fora do expediente: tratamento neutro e sem ação.

Reservas usarão o horário inicial e a duração real para ocupar visualmente o espaço correspondente. Sobreposições não serão inventadas no cliente: a disponibilidade continuará sendo validada pelas ações autoritativas existentes.

### Sidebar de criação manual

O clique em uma célula disponível abre a sidebar com data, barbeiro e horário pré-preenchidos. Barbeiro e horário permanecem editáveis.

O formulário conterá:

- nome do cliente;
- telefone;
- e-mail opcional;
- barbeiro;
- serviço oferecido pelo barbeiro;
- horário disponível;
- resumo de duração e valor antes da confirmação.

Ao mudar o barbeiro, a lista de serviços será recarregada. Ao mudar o serviço, barbeiro ou data, os horários serão recalculados. O botão “Nova reserva” abre a mesma sidebar sem barbeiro e horário pré-selecionados.

A criação continuará usando `createAdminAppointment`, incluindo a versão da configuração do serviço. Erros de configuração alterada e horário indisponível continuarão recarregando os dados afetados.

### Sidebar de detalhes

O clique em uma reserva abre os detalhes atuais, mantendo:

- cliente e contatos;
- barbeiro, serviço, duração e horário;
- adicionais e produtos registrados;
- totais financeiros;
- observações;
- ações de status permitidas pela regra atual.

Depois de uma mudança de status, a sidebar fecha e a grade é atualizada.

## Arquitetura de componentes

`AgendaClient` continuará como o limite interativo da página, mas a apresentação será separada em unidades locais com responsabilidades claras:

- cabeçalho e navegação de data;
- grade e cabeçalhos de profissionais;
- célula de horário;
- cartão de reserva;
- conteúdo da sidebar de criação;
- conteúdo da sidebar de detalhes.

Funções puras cuidarão da geração de intervalos, formatação de horários, associação de reservas às colunas e cálculo de ocupação visual. Isso permitirá testes unitários sem depender do navegador.

A página de servidor continuará carregando os dados iniciais. As consultas serão ampliadas somente se necessário para recuperar expediente, almoço e bloqueios já cadastrados.

## Fluxo de dados

1. A página recebe a data da URL e carrega barbeiros, reservas e regras necessárias.
2. A grade deriva linhas, células disponíveis e posicionamento das reservas.
3. Um clique em célula disponível define barbeiro e horário e abre a sidebar.
4. A escolha do barbeiro carrega seus serviços atuais.
5. A escolha do serviço consulta horários autoritativos para a data.
6. A criação é enviada pela ação existente.
7. Em sucesso, o formulário é limpo, a sidebar fecha e a rota é atualizada.
8. Em conflito, os serviços ou horários são recarregados e o formulário permanece aberto.

## Estados e tratamento de erros

- Sem barbeiros: orientar o usuário a cadastrar profissionais.
- Sem reservas: manter a grade disponível para criação, sem substituir a tela por um estado vazio.
- Sem horários para o serviço: mostrar mensagem inline na sidebar.
- Falha ao carregar serviços ou horários: mensagem inline, preservando os campos preenchidos.
- Conflito de disponibilidade: informar que o horário acabou de ser ocupado e atualizar as opções.
- Salvamento em andamento: desabilitar a confirmação e evitar envio duplicado.
- Grade carregando após navegação: preservar a estrutura visual da página sempre que a navegação do Next permitir.

## Responsividade e acessibilidade

- A grade terá largura mínima e rolagem horizontal em telas pequenas.
- A coluna de horário e o cabeçalho poderão permanecer visíveis durante a rolagem quando isso não causar sobreposição.
- A sidebar usará largura confortável no desktop e quase toda a largura no celular.
- Células disponíveis serão botões com rótulos acessíveis contendo horário e profissional.
- Cartões de reserva serão botões com nome, serviço, horário e status no nome acessível.
- Foco visível, navegação por teclado e contraste serão preservados.

## Validação

### Testes unitários

- geração de intervalos;
- associação de reservas a barbeiro e horário;
- cálculo da duração visual;
- estilos e rótulos por status;
- pré-preenchimento vindo de uma célula;
- recarga de serviços e horários após mudanças;
- comportamento de conflitos retornados pelas ações atuais.

### Testes de interface

- navegar entre dias;
- abrir criação por uma célula livre;
- alterar barbeiro e horário pré-preenchidos;
- criar uma reserva e vê-la na grade;
- abrir detalhes de uma reserva;
- atualizar status e refletir a mudança;
- impedir criação em almoço, folga, bloqueio e fora do expediente;
- verificar uso em desktop e celular.

## Critérios de aceite

- A Agenda volta a ser uma grade diária por barbeiro e horário.
- Um horário livre abre a sidebar de criação com barbeiro e horário preenchidos e editáveis.
- Uma reserva abre a sidebar de detalhes.
- As integrações atuais de serviço por barbeiro, disponibilidade, adicionais, produtos e status não regridem.
- Horários indisponíveis não permitem criação.
- A tela continua utilizável em dispositivos móveis.
- Testes, lint e build relacionados passam.
