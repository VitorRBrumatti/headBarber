# Parceiro oficial na home e simplificação da sidebar

## Objetivo

Adicionar a marca Hoffmann's Barber à tela inicial do dashboard como parceiro oficial, reorganizar a navegação para que `Financeiro` apareça imediatamente abaixo de `Agenda` e remover `Admin Master` da sidebar.

## Escopo visual

A home receberá uma faixa clara ao final do conteúdo, antes do encerramento visual da página. A faixa seguirá os tokens atuais do dashboard: fundo branco, borda cinza suave, cantos arredondados e sombra discreta.

O conteúdo será centralizado e terá:

- o rótulo `Parceiro Oficial` em tipografia pequena, com destaque dourado;
- a logo Hoffmann's Barber fornecida pelo usuário, preservando proporção e transparência;
- dimensões responsivas para permanecer legível sem dominar a página.

A imagem será armazenada em `public/brand/partners/` e renderizada com o componente de imagem do Next.js, incluindo texto alternativo descritivo.

## Navegação

A lista da sidebar passará a iniciar com esta ordem:

1. Dashboard
2. Agenda
3. Financeiro
4. Reservas

Os demais itens manterão sua ordem relativa. O item `Admin Master` será removido somente da navegação; a rota existente não será apagada, evitando uma mudança destrutiva fora do escopo solicitado.

## Responsividade e acessibilidade

A faixa usará espaçamento menor em telas compactas e limitará a largura da logo. A imagem manterá `height: auto` e não causará rolagem horizontal. O rótulo e o texto alternativo identificarão claramente a parceria.

## Verificação

- Confirmar que `Financeiro` aparece logo após `Agenda` nas sidebars desktop e móvel, que compartilham o mesmo componente.
- Confirmar que `Admin Master` não aparece na navegação.
- Confirmar que a faixa e a logo são exibidas no final da home em desktop e mobile.
- Executar lint, testes relevantes e build do Next.js.
