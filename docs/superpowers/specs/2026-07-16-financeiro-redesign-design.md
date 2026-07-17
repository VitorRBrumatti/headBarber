# Redesign da tela Financeiro

## Objetivo

Refatorar a tela `/dashboard/financeiro` para reproduzir o sistema visual fornecido nas duas referências HTML: dashboard claro, grafite e dourado, com um único drawer lateral para lançamentos manuais. A alteração deve preservar os dados, cálculos, filtros e ações financeiras existentes.

## Escopo

- Redesenhar apenas o conteúdo da rota Financeiro e sua experiência de lançamento manual.
- Manter o shell global, a navegação e a identidade já compartilhada pelo dashboard.
- Preservar filtros por período, atalhos de período, métricas, gráfico, detalhamento por categoria, listas de lançamentos e estornos.
- Substituir os dois drawers atuais por um drawer unificado chamado “Novo Lançamento”.
- Não alterar schema, migrations, consultas Supabase ou regras de cálculo financeiro.

## Direção visual

A tela usará o design system já documentado no repositório e presente nas referências:

- Fundo principal claro `#f8f9ff`.
- Superfícies brancas, bordas suaves e sombras difusas de baixa opacidade.
- Texto principal grafite `#181c21` e texto secundário `#47464b`.
- Dourado como cor de ação e seleção, com uso contido.
- Montserrat nos títulos e números de maior hierarquia; Inter em controles, rótulos e texto corrido.
- Ritmo de 8 px, gutter de 16 px, padding principal de 24 px e raio predominante de 8 px.
- Ícones Lucide já instalados, escolhidos para corresponder às metáforas da referência.

## Estrutura da página

### Cabeçalho e filtros

O cabeçalho apresenta “Financeiro”, texto de apoio curto e as ações de lançamento. Os atalhos “Mês atual”, “Últimos 30 dias” e “Ano atual” permanecem, junto ao filtro manual por data. Em telas menores, controles quebram em linhas sem overflow horizontal.

### Resumo executivo

Quatro superfícies apresentam:

1. Faturamento total, com serviços e produtos.
2. Saídas e custos, com despesas e comissões provisionadas.
3. Lucro líquido, com indicação semântica positiva ou negativa.
4. Produtividade, com ticket médio, atendimentos e produtos vendidos.

Os valores vêm exclusivamente de `FinancialOverview`; nenhum dado demonstrativo será criado.

### Visualização e detalhamento

O gráfico “Receitas vs. Despesas” mantém o processamento atual e recebe o tratamento claro da referência. O detalhamento por categoria e as listas de entradas e saídas permanecem acessíveis, com hierarquia, espaçamento e estados vazios adaptados ao novo sistema visual. Estornos continuam disponíveis somente onde já são permitidos.

## Drawer unificado

### Comportamento

- Um único estado de abertura controla o drawer.
- O drawer abre pela direita, com largura máxima de 448 px no desktop e largura total no mobile.
- A camada de fundo recebe overlay grafite translúcido e `backdrop-filter: blur(4px)`.
- O drawer fecha pelo botão de fechar, pela ação “Cancelar”, por clique no overlay ou pela tecla `Escape`.
- O foco inicial vai para o campo de valor; a interação deve preservar foco visível e semântica de diálogo.
- A animação dura aproximadamente 300 ms e respeita `prefers-reduced-motion`.

### Cabeçalho

Título “Novo Lançamento” e descrição “Registre uma nova transação financeira.”, com botão de fechar à direita.

### Alternância de tipo

Um controle segmentado alterna entre Receita e Despesa. A seleção altera os campos específicos sem abrir outro drawer.

Campos compartilhados:

- Valor.
- Data.
- Categoria.
- Descrição.

Campos de Receita:

- Categorias atuais de receita.
- Forma de pagamento: Pix, Dinheiro, Crédito, Débito e Outro.

Campos de Despesa:

- Categorias atuais de despesa.
- Opção de despesa recorrente.

O rodapé permanece fixo dentro do drawer e contém “Cancelar” e “Salvar Lançamento”. Durante o envio, a ação principal fica desabilitada e exibe estado de progresso.

### Fluxo de dados

O tipo selecionado decide qual action existente será chamada:

- Receita: `createManualRevenueAction`.
- Despesa: `createExpenseAction`.

Após sucesso, o drawer fecha e somente os campos do tipo enviado são reiniciados. Em erro, o drawer permanece aberto, os valores digitados são preservados e a mensagem é exibida junto ao formulário. Nenhuma nova action de servidor é necessária.

## Componentes

- `FinanceiroClient`: composição da tela, filtros e estado do drawer.
- Componente local do drawer financeiro: estrutura acessível, controle segmentado e formulários condicionais.
- Primitivos existentes (`Button`, `Card` e confirmação de estorno): reutilizados quando forem compatíveis com a referência.
- Helpers de formatação e gráfico: preservados, com reorganização apenas quando melhorar legibilidade e manutenção.

## Responsividade

- Desktop: quatro métricas em linha quando houver espaço; visualização e detalhamento seguem a composição da referência.
- Tablet: métricas em duas colunas e regiões densas reorganizadas verticalmente.
- Mobile: coluna única, filtros quebráveis, listas roláveis quando necessário e drawer em tela cheia.

## Estados e erros

- Valores positivos, negativos e zerados devem continuar legíveis.
- Estados vazios permanecem explícitos para receitas, despesas e categorias.
- Erros de criação ou estorno aparecem sem apagar entradas do usuário.
- Botões ficam desabilitados durante transições para evitar envio duplicado.
- Campos obrigatórios mantêm validação nativa e restrições de valor positivo.

## Verificação

- Executar lint, testes unitários relevantes e build do Next.js.
- Seguir a documentação local do Next.js 16 antes de alterar código.
- Verificar no navegador os filtros, alternância Receita/Despesa, criação de ambos os tipos, fechamento do drawer e confirmação de estorno.
- Conferir desktop e mobile.
- Comparar capturas da implementação com as duas referências, incluindo layout, tipografia, paleta, espaçamento, ícones e comportamento do drawer.
- Não considerar concluído enquanto houver overflow, texto corrompido, controle inerte ou divergência visual material corrigível.

## Fora de escopo

- Mudanças no banco de dados ou nas fórmulas financeiras.
- Novas métricas, relatórios ou integrações.
- Redesign de outras rotas do dashboard.
- Alteração do fluxo automático de receitas geradas por agendamentos e produtos.
