# Refatoração visual do agendamento com produtos opcionais

## Objetivo

Refatorar somente a experiência visual do agendamento público da HeadBarber com base nos três HTMLs fornecidos, mantendo as regras e o caminho funcional atuais. O fluxo passa a ter uma etapa opcional de produtos reservados para pagamento e retirada na barbearia.

## Escopo

- Aplicar ao agendamento público a linguagem visual premium das referências: grafite, branco, cinza e dourado.
- Preservar seleção de serviço, profissional, adicionais, data e hora, dados do cliente e confirmação.
- Inserir uma etapa exclusiva de produtos sem exigir a compra de nenhum item.
- Consultar e exibir o estoque na listagem de produtos.
- Vincular os produtos selecionados ao agendamento e reservar o estoque na confirmação.
- Exibir produtos e respectivos valores nos resumos do fluxo e da confirmação.
- Manter pagamento e retirada presenciais.

## Fora do escopo

- Pagamento online.
- Entrega de produtos.
- Alteração do fluxo administrativo completo de vendas/PDV.
- Mudanças visuais nas demais páginas do dashboard, exceto a exposição mínima dos produtos reservados nos dados de uma reserva quando necessária para operação.
- Registro antecipado da reserva como receita ou venda paga.

## Fluxo aprovado

O agendamento terá sete etapas, nesta ordem:

1. Serviço
2. Profissional
3. Adicionais
4. Produtos
5. Data e hora
6. Dados pessoais
7. Confirmação

A etapa de produtos é opcional. O cliente pode avançar sem selecionar itens por meio de uma ação clara, como `Pular produtos`. Todas as outras validações permanecem iguais às atuais.

## Direção visual

### Base visual

- Fundo principal grafite `#1A1A1D`.
- Texto principal branco e texto secundário cinza.
- Dourado `#C79A4A` reservado para seleção, progresso, sucesso e ações primárias.
- Montserrat em títulos e Inter em textos, rótulos e controles.
- Ritmo de espaçamento em múltiplos de 8 px.
- Bordas discretas e raios entre 8 e 12 px.
- Profundidade obtida por camadas tonais e bordas de baixa opacidade, sem sombras pesadas.

### Estrutura da página

- Cabeçalho transacional fixo com a marca/nome da barbearia e ação `Cancelar`.
- Progresso das sete etapas no topo da área de conteúdo.
- Em telas pequenas, progresso compacto com etapa atual e contagem para evitar rótulos comprimidos.
- Conteúdo central responsivo, limitado a uma largura confortável para leitura.
- Barra de ação fixa no rodapé com total acumulado, duração quando aplicável, voltar e avançar.
- Controles e textos reais continuam sendo elementos HTML acessíveis; as referências não serão incorporadas como screenshots.

### Estados de seleção

- Card padrão: superfície grafite elevada, borda branca de baixa opacidade.
- Hover/foco: borda mais visível e foco acessível.
- Selecionado: borda dourada, fundo dourado de baixa opacidade e indicador de seleção.
- Desabilitado: contraste reduzido, sem interação e motivo explícito.

## Etapa de produtos

Cada produto apresenta:

- imagem real quando cadastrada e fallback visual consistente quando ausente;
- nome e descrição;
- preço unitário;
- disponibilidade em estoque;
- controle de quantidade para itens disponíveis;
- indicação `Pagamento e retirada na barbearia`.

### Regras de estoque na listagem

- A carga inicial do agendamento consulta produtos ativos da barbearia, incluindo `stock_quantity`.
- Produto com estoque zero aparece desabilitado com o rótulo `Esgotado` e não pode ser selecionado.
- Produto disponível informa o estoque e limita o seletor à quantidade carregada.
- O cliente pode remover um item reduzindo sua quantidade a zero.
- A ausência de produtos ativos ou disponíveis não bloqueia o fluxo; a tela informa a situação e permite avançar.

### Totais

- O subtotal de atendimento contém serviço e adicionais.
- O subtotal de produtos contém preço unitário multiplicado pela quantidade.
- O total exibido ao cliente é a soma dos dois subtotais.
- A confirmação diferencia claramente `Atendimento` e `Produtos para retirada`.
- O texto final usa `Total a pagar na barbearia`, e não `Total pago`.

## Confirmação e reserva de estoque

A confirmação do agendamento deve ser transacional:

1. Validar novamente o estoque de todos os produtos selecionados.
2. Criar o agendamento com as regras atuais de concorrência de horário.
3. Criar os vínculos entre agendamento e produtos, armazenando produto, quantidade e preço unitário daquele momento.
4. Decrementar o estoque reservado na mesma transação.

Se qualquer item não tiver mais a quantidade solicitada, nenhuma reserva parcial de produto será persistida. A interface preserva serviço, profissional, adicionais, data, hora e dados pessoais, retorna à etapa de produtos e destaca os itens que precisam de ajuste.

Produtos reservados não são registrados como venda paga nem como receita na confirmação pública. A liquidação financeira/forma de pagamento no momento da retirada não faz parte desta refatoração.

## Cancelamento

Quando um agendamento com produtos reservados mudar para `cancelled`, as quantidades ainda reservadas retornam ao estoque uma única vez. A operação precisa ser idempotente para impedir devolução duplicada quando o status for salvo novamente.

## Modelo de dados

Adicionar uma relação própria entre agendamento e produto, com pelo menos:

- `appointment_id`;
- `product_id`;
- `quantity` maior que zero;
- `unit_price` não negativo, preservando o preço no momento da reserva;
- estado da reserva necessário para impedir devolução duplicada;
- timestamps.

Índices devem cobrir consultas por agendamento e produto. As políticas RLS devem manter isolamento por barbearia. A criação pública ocorre apenas pela função transacional autorizada, sem liberar escrita anônima direta nas tabelas.

## Componentes e responsabilidades

- `BookingProgress`: representa as sete etapas e suas variantes desktop/mobile.
- `BookingHeader`: marca e saída do fluxo.
- `SelectableCard`: base visual acessível para serviço, profissional e adicionais.
- `ProductStep`: lista disponibilidade, controla quantidades e permite pular.
- `BookingSummaryBar`: calcula e apresenta duração e totais sem duplicar regra de preço.
- `BookingConfirmation`: revisão completa antes do envio.
- `BookingSuccess`: confirmação animada e resumo final conforme a referência enviada.

O estado do wizard continua local ao cliente. A consulta inicial permanece no componente de servidor e a criação final continua em Server Action/RPC. A refatoração deve evitar um componente monolítico e manter limites claros entre apresentação, estado do fluxo e persistência.

## Tratamento de erros

- Falha ao carregar produtos: mostrar estado de erro recuperável e permitir seguir sem produtos.
- Produto esgotado na carga: card desabilitado com explicação imediata.
- Estoque alterado antes da confirmação: mensagem específica por item, retorno à etapa de produtos e preservação do restante do formulário.
- Conflito de horário: manter o tratamento atual e não consumir estoque.
- Falha transacional: não criar vínculo parcial nem decrementar estoque parcialmente.
- Erros de campos obrigatórios: manter validações atuais com mensagens próximas aos campos.

## Acessibilidade e responsividade

- Cards selecionáveis serão acionáveis por teclado e terão estado acessível.
- Botões terão foco visível e rótulos claros.
- Imagens terão texto alternativo apropriado.
- A barra fixa não poderá cobrir o conteúdo final.
- A interface será verificada em desktop e celular, incluindo progresso, rolagem horizontal de datas, quantidade de produtos e confirmação.
- Movimento respeitará `prefers-reduced-motion`.

## Verificação

### Fluxos funcionais

- Agendamento sem adicionais e sem produtos.
- Agendamento com adicionais e sem produtos.
- Agendamento com um ou vários produtos e quantidades diferentes.
- Produto esgotado já na listagem.
- Estoque reduzido entre listagem e confirmação.
- Disputa pela última unidade sem estoque negativo.
- Conflito de horário sem consumo de estoque.
- Cancelamento com devolução exata do estoque.
- Repetição do cancelamento sem devolução duplicada.

### Verificação visual

- Comparar serviço, profissional, produtos, confirmação e sucesso com as referências fornecidas.
- Conferir paleta, tipografia, hierarquia, bordas, raios, espaçamento e barra fixa.
- Validar que dourado é usado apenas nos pontos de ênfase aprovados.
- Conferir que nenhuma etapa do fluxo atual desapareceu ou mudou de regra.
- Verificar ausência de overflow, conteúdo encoberto e rótulos comprimidos em telas pequenas.

## Critérios de aceite

- O fluxo possui exatamente sete etapas na ordem aprovada.
- Produtos são opcionais e podem ser pulados.
- Estoque zero é informado e bloqueado já na listagem.
- Quantidade selecionada não ultrapassa o estoque carregado.
- A confirmação revalida e reserva estoque de forma atômica.
- Cancelamento devolve estoque uma única vez.
- Não há pagamento online nem lançamento antecipado como venda paga.
- O visual corresponde às referências em grafite, branco, cinza e dourado.
- O fluxo anterior continua funcional com ou sem produtos.
- Testes automatizados e verificação visual responsiva passam antes da entrega.
