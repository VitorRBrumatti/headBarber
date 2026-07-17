# Financeiro branco e gráfico legível — Design

## Objetivo

Garantir que `/dashboard/financeiro` permaneça integralmente claro, mesmo quando o sistema operacional estiver em modo escuro, e tornar o gráfico financeiro legível tanto com dados quanto no estado zerado.

## Direção visual aprovada

- Fundo da área do Financeiro e todas as superfícies em branco puro (`#ffffff`).
- Bordas e divisores em cinza-claro (`#e0e2e9` ou `#eceef4`).
- Texto principal em grafite (`#181c21`) e texto secundário em `#47464b`.
- Dourado `#C79A4A` como cor de receita e destaque do produto.
- Vermelho `#ba1a1a` reservado para despesas e valores negativos.
- Nenhuma classe global de tema escuro poderá alterar a tela Financeiro.

## Implementação

A correção será isolada em `financeiro-client.tsx`. A constante compartilhada das superfícies usará utilitários com prioridade para sobrescrever as variantes `dark:` do componente global `Card`, sem alterar outros consumidores. O contêiner principal também terá fundo branco e `color-scheme: light` para manter controles nativos de data coerentes.

O gráfico continuará em SVG e preservará os cálculos atuais. A apresentação será ajustada para:

- área de plotagem branca com moldura leve;
- grade sólida e discreta;
- rótulos de eixo maiores e com maior contraste;
- linhas mais espessas, pontos visíveis e legenda clara;
- receita dourada e despesa vermelha;
- escala monetária explícita;
- estado vazio dedicado quando não houver movimentações, sem desenhar uma linha vermelha falsa em zero.

## Responsividade e acessibilidade

O gráfico manterá rolagem horizontal somente quando necessária em telas estreitas, sem causar overflow na página. O estado vazio terá texto visível e o SVG manterá nome acessível. Desktop, mobile e preferência de tema escuro serão verificados por Playwright.

## Fora do escopo

- Alterar o componente global `Card`.
- Alterar cálculos, consultas Supabase ou Server Actions.
- Adicionar bibliotecas de gráficos.
- Modificar outras telas do dashboard.
