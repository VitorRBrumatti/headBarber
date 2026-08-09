# Toggles de catálogo e benefícios de plano

## Objetivo

Substituir os checkboxes nativos visíveis nos fluxos de serviços, adicionais e edição de planos por um toggle consistente com a interface do HeadBarber. A alteração é apenas visual e de acessibilidade; o estado, as ações e a persistência existentes permanecem inalterados.

## Escopo

- Controle “Catálogo ativo” nos cards de serviços.
- Controle “Catálogo ativo” nos cards de adicionais.
- Controle de ativo nos formulários de criar e editar serviço.
- Controle de ativo nos formulários de criar e editar adicional.
- Controle de disponibilidade por profissional nos formulários de serviço e adicional.
- Seleção de benefícios na criação e edição de planos mensais.

Checkboxes que representam outras funções fora desses fluxos não fazem parte desta alteração.

## Abordagens consideradas

### 1. Componente compartilhado de toggle — escolhida

Criar um componente de UI reutilizável e controlado, mantendo um `input` nativo como base semântica. Centraliza aparência, foco, estados de hover e disabled, além de evitar divergência entre telas.

### 2. Estilização local em cada tela

Exigiria menos estrutura inicial, mas repetiria classes e aumentaria a chance de os controles ficarem diferentes com futuras alterações.

### 3. Dependência externa de componentes

Ofereceria uma primitiva pronta, mas adicionaria uma biblioteca para um controle simples que o projeto consegue atender com HTML, React e Tailwind já instalados.

## Design aprovado

O toggle terá trilho compacto em formato pill, marcador circular branco e transição de estado curta. O estado desligado usará o neutro do design system e o estado ligado usará o dourado funcional da marca. O texto continuará ao lado do controle e não dependerá apenas da cor para comunicar significado.

O componente aceitará `checked`, `onCheckedChange`, `disabled`, `aria-label` e classes adicionais. O `input` continuará acessível por teclado, terá foco visível e preservará uma área de interação confortável por meio do `label` que envolve controle e texto.

Nos cards de catálogo, o toggle continuará disparando imediatamente a ação atual. Nos formulários, continuará atualizando o estado local enviado no `FormData`. Nos benefícios do plano, continuará selecionando o benefício e habilitando ou desabilitando o campo de limite correspondente.

## Estados e acessibilidade

- Ligado: trilho dourado e marcador deslocado para a direita.
- Desligado: trilho neutro e marcador à esquerda.
- Hover: reforço discreto do trilho, sem movimento decorativo.
- Foco: anel visível com contraste adequado.
- Disabled: redução de contraste e cursor indisponível, sem perder legibilidade.
- Teclado: acionamento pelo comportamento nativo do checkbox.
- Movimento reduzido: o controle não dependerá da transição para comunicar o estado.

## Validação

- Testes existentes dos fluxos de serviços, adicionais e planos.
- Teste unitário do componente compartilhado e/ou contratos de renderização dos controles.
- Verificação de lint e TypeScript.
- Conferência visual dos estados ligado, desligado, foco e disabled nas telas afetadas.

## Fora de escopo

- Alterações em banco de dados, ações do servidor ou regras de ativação.
- Redesign dos cards, formulários ou tela de planos além dos controles descritos.
- Substituição global de todo checkbox do produto.
