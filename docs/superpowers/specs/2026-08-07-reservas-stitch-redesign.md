# Redesign do histórico de reservas

## Objetivo

Aplicar o design fornecido pelo Google Stitch à área de conteúdo de `/dashboard/reservas`, preservando o shell global atual, a consulta Supabase, os dados históricos e as regras financeiras existentes.

## Direção aprovada

O redesenho será fiel à referência somente dentro da página. A sidebar e a barra superior continuarão pertencendo ao `DashboardShell`, evitando navegação duplicada e mantendo consistência com as demais áreas do produto.

## Estrutura da tela

- Cabeçalho com marcador dourado, título, texto de apoio e total de reservas encontradas.
- Barra de ferramentas com busca por nome ou telefone e filtro de status.
- Tabela desktop com data/hora, cliente, serviço, profissional, valor, status e ação de abrir detalhes.
- Cartões equivalentes em telas pequenas, preservando a mesma hierarquia de informação.
- Estado vazio integrado à superfície da listagem.
- Painel lateral aberto ao selecionar qualquer linha ou cartão.

## Painel de detalhes

O painel exibirá somente dados reais disponíveis em `AppointmentDetails`:

- iniciais, nome e telefone do cliente;
- status da reserva;
- serviço, profissional, data, horário e duração total;
- preço do serviço, adicionais e total do atendimento;
- benefício de assinatura, quando existente, incluindo valor coberto e valor a pagar;
- produtos não cancelados e respectivo subtotal;
- total final na barbearia;
- observações, quando preenchidas.

Produtos cancelados não entram no subtotal. A ausência de adicionais, produtos, assinatura ou observações terá tratamento visual explícito sem inventar conteúdo.

## Sistema visual

A implementação reutilizará os tokens já presentes no projeto e na referência: fundo `#f8f9ff`, superfícies brancas, texto grafite, bordas tonais, Montserrat nos títulos, Inter no conteúdo e dourado `#C79A4A` apenas como destaque. A tabela terá sombra discreta, linhas com resposta visual ao hover e badges semânticos por status.

## Interações e acessibilidade

- Busca e filtro continuarão funcionando no cliente sobre os dados já carregados.
- Linhas serão acionáveis por teclado e terão nome acessível.
- O painel fechará pelo botão, pelo fundo e pela tecla Escape.
- Estados de foco serão visíveis.
- Datas e valores continuarão formatados em `pt-BR`.

## Limites de escopo

Não serão alterados o schema, a consulta, os mapeadores de agendamento, as transições de status nem o restante do dashboard. O redesign não adicionará paginação, edição de reservas ou novos filtros que não existam na referência funcional aprovada.

## Verificação

- Testes unitários existentes devem continuar passando.
- Serão adicionadas verificações focadas na estrutura do redesign e nos rótulos financeiros preservados.
- A página será validada em desktop e mobile, incluindo busca, filtro, estado vazio e abertura/fechamento do painel.
- O resultado renderizado será comparado visualmente com a referência do Stitch antes da entrega.
