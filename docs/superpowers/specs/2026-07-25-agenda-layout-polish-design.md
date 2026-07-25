# Refinamento de layout da agenda

## Objetivo

Corrigir a densidade e o ritmo visual da agenda diária sem alterar sua
arquitetura, seus dados ou o fluxo de criação e edição de reservas.

## Problemas observados

- Cards de reservas de 30 minutos possuem conteúdo mais alto que a célula.
- Horário e valor escapam do fundo colorido e encostam na próxima linha.
- Linhas de 76 px deixam horários livres excessivamente altos.
- Cabeçalho, navegação de datas e ação principal têm ritmo pouco uniforme.
- Períodos indisponíveis repetem o mesmo rótulo em todas as células.

## Direção aprovada

Usar densidade equilibrada e preservar o visual atual:

- Cabeçalho da grade com 56 px.
- Cada intervalo de 30 minutos com 64 px.
- Coluna de horário com 72 px.
- Card de reserva compacto em duas faixas: identidade/estado e
  serviço/horário/valor.
- Todos os metadados permanecem dentro do fundo do card.
- O primeiro intervalo indisponível exibe o motivo; os seguintes mantêm apenas
  o padrão visual enquanto o estado permanecer igual.
- Controles superiores usam alturas, raios e espaçamentos consistentes.
- Em telas menores, os controles ocupam a largura disponível e a grade mantém
  rolagem horizontal deliberada.

## Comportamento

- Clicar em uma reserva continua abrindo seus detalhes.
- Clicar em um horário livre continua abrindo a criação manual.
- Estados de hover, foco e pressionado permanecem visíveis.
- A duração real continua determinando quantas linhas a reserva ocupa.
- Reservas longas podem usar o espaço adicional, mas não dependem dele para
  mostrar as informações essenciais.

## Componentes afetados

- `AgendaClient`: ritmo do cabeçalho e comportamento responsivo dos controles.
- `AgendaGrid`: dimensões da grade, composição dos cards e rótulos de
  indisponibilidade.
- Testes da grade: contratos de renderização e prevenção de regressões.

## Validação

- Teste unitário para o conteúdo e a semântica dos cards.
- Renderização em desktop próxima à captura de referência.
- Renderização em viewport móvel.
- Interação com navegação de data e abertura de reserva/horário.
- Ausência de sobreposição, clipping e erros no console.
- Testes completos, lint dos arquivos alterados e build de produção.

## Fora de escopo

- Alterar regras de disponibilidade ou cálculo de horários.
- Redesenhar o shell do dashboard.
- Modificar cores da marca, fontes ou estrutura de dados.
- Alterar migrations ou o banco de dados.
