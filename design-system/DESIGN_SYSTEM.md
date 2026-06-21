# HeadBarber Design System

> **Status:** especificação oficial proposta para futuras implementações  
> **Versão:** 1.0.0  
> **Atualizado em:** 20 de junho de 2026  
> **Escopo desta versão:** documentação. Nenhum componente, estilo, rota ou regra de negócio é alterado por este arquivo.

## 1. Visão geral

O design system do HeadBarber orienta a experiência de uma plataforma SaaS de gestão para barbearias. Ele deve unir a eficiência de uma ferramenta operacional, usada durante um dia de trabalho intenso, à percepção de cuidado encontrada em barbearias premium.

### Propósito

- Dar uma linguagem única à landing page, autenticação, onboarding, dashboard e agendamento público.
- Acelerar decisões futuras de produto e frontend por meio de tokens e padrões previsíveis.
- Reduzir inconsistências entre cadastros, tabelas, agenda, financeiro e configurações.
- Garantir que estados críticos, como confirmação, cancelamento, conflito de horário e erro de pagamento, sejam inequívocos.
- Permitir evolução gradual sobre React, Next.js, Tailwind CSS e componentes inspirados no modelo composicional do shadcn/ui.

### Público-alvo

| Público | Necessidade principal | Implicação de design |
|---|---|---|
| Donos e gestores | Visão do negócio, caixa, equipe e configuração | Hierarquia objetiva, dados comparáveis e ações seguras |
| Barbeiros e atendentes | Agenda rápida, contexto do cliente e atualização de status | Alta escaneabilidade, poucos cliques e alvos de toque amplos |
| Clientes da barbearia | Reservar sem dúvidas ou cadastro complexo | Fluxo linear, linguagem simples e resumo persistente |
| Operação HeadBarber | Administração de contas e suporte | Densidade controlada, filtros, auditoria e separação de privilégios |

### Personalidade e sensação

**Preciso, acolhedor, premium, discreto e confiável.** A interface deve parecer uma ferramenta madura, não uma peça temática de barbearia. Preto, marfim e cinzas formam a base; champagne sinaliza marca, seleção e momentos de valor. Ícones de tesoura ou poste de barbeiro devem ser raros e funcionais, nunca decoração repetitiva.

### Princípios do produto

1. **A tarefa vem antes da decoração.** Agenda, cadastro e fechamento de caixa precisam ser óbvios em segundos.
2. **Consistência cria velocidade.** A mesma ação, estado e hierarquia devem parecer iguais em todas as áreas.
3. **Confiança exige contexto.** Ações irreversíveis explicam impacto, mostram o alvo e pedem confirmação proporcional ao risco.
4. **Premium significa precisão.** Tipografia, alinhamento, espaçamento e conteúdo bem editado valem mais que efeitos visuais.
5. **O sistema ensina o próximo passo.** Estados vazios e onboarding orientam, em vez de apenas informar ausência.

## 2. Princípios de design

| Princípio | Regra prática |
|---|---|
| Clareza | Uma ação primária por região. Títulos dizem o que existe; descrições dizem por que importa. |
| Consistência | Tokens substituem valores arbitrários. Componentes compartilham estados, altura e linguagem. |
| Velocidade | Ações frequentes ficam visíveis; filtros preservam contexto; skeletons mantêm a estrutura. |
| Confiança | Valores, datas, status e consequências aparecem antes de confirmar uma ação. |
| Hierarquia | Escala, peso, contraste e espaço definem prioridade. Cor não sustenta hierarquia sozinha. |
| Acessibilidade | WCAG 2.2 AA é o mínimo, com teclado completo e foco sempre visível. |
| Sofisticação | Neutros levemente quentes, bordas finas, sombras raras e champagne usado com parcimônia. |
| Responsividade | O conteúdo reorganiza por prioridade; não é apenas reduzido proporcionalmente. |
| Simplicidade | Mostrar primeiro o necessário e revelar opções avançadas de forma progressiva. |

## 3. Identidade visual

### Conceito: precisão artesanal

O HeadBarber combina dois universos: a disciplina operacional de um SaaS e o cuidado material de uma barbearia premium. A precisão aparece em grids, tabelas, agenda e números tabulares. O caráter artesanal aparece em neutros quentes, detalhes champagne e fotografia real, quando disponível.

**Cena de uso que orienta o tema:** um gestor consulta a agenda em um monitor durante o expediente, sob iluminação clara, enquanto um atendente usa o celular no balcão. Por isso, o dashboard deve ser **light-first**, com tema escuro completo para preferência do usuário. A página pública pode respeitar o tema configurado pela barbearia, sem comprometer legibilidade.

### Relação com a referência Cal.com

Adotar os princípios, não a aparência:

- Adotar hierarquia direta, respiro, uma ação dominante e componentes de agendamento familiares.
- Exibir fragmentos reais do produto na comunicação futura, em vez de ilustrações genéricas.
- Separar marketing, produto e booking por densidade, mantendo os mesmos tokens centrais.
- Não copiar Cal Sans, navegação, composição de hero, textos, paleta ou geometria proprietária.
- A identidade HeadBarber deve ser reconhecida pelos neutros quentes, champagne contido, fotografia de ofício e linguagem em português brasileiro.

### Direção visual

- Base clara em marfim frio-quente, nunca branco puro em grandes áreas.
- Preto carvão em vez de `#000000`; texto principal com leve calor.
- Champagne em até aproximadamente 10% da superfície, reservado a marca, foco, seleção e destaques.
- Sem gradientes em texto, brilhos dourados, glassmorphism decorativo ou cards flutuando sem função.
- Lucide como família de ícones atual. Tamanho padrão de 16 ou 20 px, traço consistente.
- Fotografia, quando usada, deve mostrar ambientes e profissionais reais, com luz natural e enquadramento editorial.

## 4. Tokens de design

Tokens devem ser referenciados por função, nunca pelo nome visual. Use `background`, não `white`; use `destructive`, não `red`.

### 4.1 Cores primitivas

| Família | Token | Hex sugerido | Uso |
|---|---|---:|---|
| Ink | `ink-950` | `#151411` | Superfícies escuras e texto de maior contraste |
| Ink | `ink-900` | `#1D1C19` | Botão principal e foreground escuro |
| Stone | `stone-700` | `#4B4943` | Texto secundário forte |
| Stone | `stone-500` | `#77736A` | Texto auxiliar acessível em fundo claro |
| Stone | `stone-300` | `#C8C3BA` | Bordas fortes e controles desabilitados |
| Stone | `stone-200` | `#DEDAD2` | Bordas padrão |
| Stone | `stone-100` | `#EEEAE3` | Fundo muted e separadores suaves |
| Ivory | `ivory-50` | `#F8F6F1` | Background da aplicação |
| Ivory | `ivory-0` | `#FEFCF8` | Cards e superfícies elevadas |
| Champagne | `champagne-700` | `#896128` | Texto dourado sobre fundo claro |
| Champagne | `champagne-600` | `#A87935` | Borda/ícone de marca em tema claro |
| Champagne | `champagne-500` | `#C49755` | Accent principal |
| Champagne | `champagne-300` | `#E0C494` | Accent em tema escuro |
| Champagne | `champagne-100` | `#F3E8D3` | Fundo selecionado ou informativo de marca |

Os equivalentes de implementação podem ser registrados em OKLCH durante a Fase 1. Hex é fornecido aqui como contrato visual de fácil inspeção. Toda conversão deve preservar contraste, e não apenas semelhança numérica.

### 4.2 Escala de espaçamento

Base de 4 px. Não criar valores intermediários sem justificar uma necessidade de componente.

| Token | Valor | Uso principal |
|---|---:|---|
| `space-0` | 0 | Reset |
| `space-1` | 4 px | Separação mínima, ícone interno |
| `space-2` | 8 px | Elementos inline |
| `space-3` | 12 px | Gaps compactos |
| `space-4` | 16 px | Padding de controle/card compacto |
| `space-5` | 20 px | Padding intermediário |
| `space-6` | 24 px | Card e gap padrão |
| `space-8` | 32 px | Blocos de formulário |
| `space-10` | 40 px | Grupos principais |
| `space-12` | 48 px | Cabeçalho para conteúdo |
| `space-16` | 64 px | Seção compacta de marketing |
| `space-20` | 80 px | Seção mobile/tablet |
| `space-24` | 96 px | Seção desktop de marketing |
| `space-32` | 128 px | Hero amplo, uso excepcional |

### 4.3 Radius, borda e sombra

| Token | Valor | Uso |
|---|---:|---|
| `radius-xs` | 4 px | Indicadores pequenos |
| `radius-sm` | 6 px | Badges e itens compactos |
| `radius-md` | 8 px | Inputs, buttons e tabs |
| `radius-lg` | 12 px | Cards, dropdowns e popovers |
| `radius-xl` | 16 px | Dialogs, booking shell e destaques |
| `radius-full` | 9999 px | Avatar, switch e badge pill |
| `border-subtle` | 1 px solid `border-subtle` | Divisores e agrupamentos |
| `border-default` | 1 px solid `border` | Controles e cards |
| `border-strong` | 1 px solid `border-strong` | Seleção e ênfase semântica |
| `shadow-xs` | `0 1px 2px rgb(21 20 17 / 0.05)` | Controle elevado |
| `shadow-sm` | `0 4px 12px rgb(21 20 17 / 0.07)` | Dropdown e card interativo |
| `shadow-md` | `0 12px 32px rgb(21 20 17 / 0.12)` | Dialog e sheet |

Cards estáticos são preferencialmente definidos por superfície e borda, sem sombra. Não usar sombras coloridas ou glow.

### 4.4 Grid e containers

| Token | Valor |
|---|---:|
| `container-marketing` | 1200 px |
| `container-product` | 1440 px ou largura disponível após sidebar |
| `container-form-sm` | 480 px |
| `container-form-md` | 640 px |
| `container-reading` | 720 px |
| `grid-columns` | 12 desktop, 8 tablet, 4 mobile |
| `gutter-mobile` | 16 px |
| `gutter-tablet` | 24 px |
| `gutter-desktop` | 32 px |

### 4.5 Z-index e blur

| Token | Valor | Camada |
|---|---:|---|
| `z-base` | 0 | Conteúdo |
| `z-sticky` | 20 | Header e filtros sticky |
| `z-dropdown` | 40 | Menu, popover, select |
| `z-overlay` | 50 | Overlay de sheet/dialog |
| `z-modal` | 60 | Dialog e sheet |
| `z-toast` | 80 | Toasts |
| `z-tooltip` | 90 | Tooltip |
| `blur-overlay` | 2 px | Apenas para separar overlay do conteúdo |

Blur não é uma superfície. Evitar painéis translúcidos; usar no máximo no overlay de modal ou navegação móvel.

### 4.6 Motion

| Token | Valor | Uso |
|---|---:|---|
| `duration-instant` | 80 ms | Press feedback |
| `duration-fast` | 150 ms | Hover, focus, cor |
| `duration-base` | 200 ms | Dropdown, tabs, tooltip |
| `duration-slow` | 280 ms | Dialog, sheet e reorganização curta |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Transições gerais |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Saídas rápidas |
| `ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entradas naturais |

### 4.7 Breakpoints

| Nome | Largura | Comportamento esperado |
|---|---:|---|
| `xs` | 360 px | Menor viewport suportado |
| `sm` | 640 px | Formulários e ações podem alinhar horizontalmente |
| `md` | 768 px | Sidebar vira drawer abaixo deste ponto |
| `lg` | 1024 px | Grids de dashboard e tabelas completas |
| `xl` | 1280 px | Densidade operacional ideal |
| `2xl` | 1536 px | Conteúdo limita largura e ganha respiro externo |

## 5. Sistema de cores semânticas

### Tema claro, padrão operacional

| Token | Valor | Quando usar |
|---|---:|---|
| `background` | `#F8F6F1` | Canvas da aplicação |
| `foreground` | `#1D1C19` | Texto principal |
| `surface` / `card` | `#FEFCF8` | Cards, menus e inputs |
| `card-foreground` | `#1D1C19` | Conteúdo sobre card |
| `primary` | `#1D1C19` | Ação principal e seleção de alto peso |
| `primary-foreground` | `#FEFCF8` | Conteúdo sobre primary |
| `secondary` | `#EEEAE3` | Ações secundárias e superfície discreta |
| `secondary-foreground` | `#35332E` | Conteúdo sobre secondary |
| `muted` | `#EEEAE3` | Áreas inativas, skeleton e agrupamento |
| `muted-foreground` | `#68655E` | Legendas e metadados |
| `border` | `#DEDAD2` | Controles e cards |
| `border-subtle` | `#EEEAE3` | Divisores internos |
| `border-strong` | `#A8A299` | Ênfase estrutural |
| `accent` | `#A87935` | Marca, seleção, ícone-chave e foco |
| `accent-foreground` | `#1D160C` | Texto sobre accent claro |
| `accent-subtle` | `#F3E8D3` | Fundo de seleção champagne |
| `destructive` | `#B42318` | Exclusão, falha e cancelamento perigoso |
| `destructive-subtle` | `#FEECE9` | Fundo de erro |
| `success` | `#237A4B` | Concluído, pago e salvo |
| `success-subtle` | `#E7F5EC` | Fundo de sucesso |
| `warning` | `#98600A` | Atenção, pendência e risco recuperável |
| `warning-subtle` | `#FFF3D6` | Fundo de alerta |
| `info` | `#27638E` | Contexto neutro e informação |
| `info-subtle` | `#E8F3FA` | Fundo informativo |
| `ring` | `#A87935` | Foco visível, com halo adicional |

### Tema escuro

| Token | Valor | Regra |
|---|---:|---|
| `background` | `#151411` | Canvas |
| `foreground` | `#F4F0E8` | Texto principal |
| `surface` / `card` | `#1D1C19` | Superfície elevada |
| `primary` | `#D6AF70` | Ação principal |
| `primary-foreground` | `#18130B` | Conteúdo sobre primary |
| `secondary` / `muted` | `#292722` | Superfície discreta |
| `muted-foreground` | `#AAA49A` | Texto auxiliar |
| `border` | `#3A3731` | Borda padrão |
| `accent` | `#D6AF70` | Marca e foco |
| `destructive` | `#F97066` | Erro |
| `success` | `#5BC58A` | Sucesso |
| `warning` | `#E9B44C` | Alerta |
| `info` | `#6CB6E5` | Informação |
| `ring` | `#E0C494` | Foco |

**Regras de uso:** champagne não representa sucesso; verde não representa marca; vermelho não deve indicar apenas “inativo”. Status sempre combina texto ou ícone com cor. Texto dourado em fundo claro usa `champagne-700`, nunca `champagne-500` em corpo pequeno.

## 6. Tipografia

### Famílias

- **Produto e UI:** Geist Sans, já alinhada à base técnica atual. Fallback: `Inter, ui-sans-serif, system-ui, sans-serif`.
- **Dados tabulares:** Geist Mono para valores financeiros, horários, códigos e números que precisam alinhar. Não usar mono em labels inteiras.
- **Marketing:** Geist Sans com contraste de escala e tracking. Uma futura fonte de display só deve ser introduzida após validação de marca, performance e licença.

### Escala

| Token | Tamanho/linha | Peso | Uso |
|---|---|---:|---|
| `display-xl` | 64/68 px | 650 | Hero desktop, marketing |
| `display-lg` | 48/52 px | 650 | Seção principal de marketing |
| `display-md` | 36/42 px | 650 | Hero mobile e CTA |
| `heading-xl` | 30/36 px | 650 | Título de página pública |
| `heading-lg` | 24/30 px | 650 | Título de página no produto |
| `heading-md` | 20/26 px | 600 | Título de seção/card importante |
| `heading-sm` | 16/22 px | 600 | Card e agrupamento |
| `body-lg` | 18/28 px | 400 | Introdução e marketing |
| `body-md` | 16/24 px | 400 | Formulários e conteúdo padrão |
| `body-sm` | 14/20 px | 400 | Tabelas, navegação e apoio |
| `label` | 14/20 px | 550 | Labels e botões |
| `caption` | 12/16 px | 450 | Metadados e ajuda curta |
| `overline` | 11/16 px | 650 | Uso raro, uppercase com `0.06em` |

### Regras de legibilidade

- Corpo de marketing limitado a 65 a 72 caracteres por linha.
- Produto usa títulos em sentence case; evitar tudo em maiúsculas em labels extensas.
- Botões descrevem ação: “Salvar serviço”, não “Confirmar”.
- Tabelas usam 14 px no mínimo; formulários públicos usam 16 px para evitar zoom automático no iOS.
- Números financeiros usam `font-variant-numeric: tabular-nums` e formato brasileiro.
- Headings usam tracking entre `-0.01em` e `-0.03em`; corpo permanece em `0`.
- Não depender de peso menor que 400 em interfaces operacionais.

## 7. Layout e grid

### Landing page

Container de 1200 px, grid de 12 colunas e seções com 80 px mobile e 96 px desktop. Hero em composição 7/5 ou 6/6, com mensagem e CTA de um lado e fragmento real do produto do outro. Alternar superfícies por função, não por decoração. Footer escuro pode encerrar a página.

### Dashboard e páginas internas

- Sidebar desktop: 248 px, fixa ou sticky; conteúdo não fica sob a navegação.
- Header mobile: 56 px; drawer com overlay, fechamento por `Esc` e retorno de foco.
- Conteúdo: 24 px em mobile, 32 px em desktop, máximo de 1440 px quando útil.
- `PageHeader`: título, descrição e ações no mesmo nível em desktop; ações abaixo em mobile.
- Distância padrão: 32 px entre header e conteúdo, 24 px entre seções, 16 px entre itens relacionados.
- Não envolver toda seção em card. Use cards para agrupamentos com relação ou comportamento próprios.

### Agendamento público

Shell máximo de 960 px. Em desktop, conteúdo e resumo podem usar 7/5 colunas; em mobile, uma coluna com barra inferior de ação sticky. Progresso mostra etapa atual, etapas completas e nome da etapa, sem comprimir seis labels em uma tela estreita.

### Formulários

- Uma coluna até 640 px; duas colunas somente para campos curtos e relacionados.
- Label acima, ajuda abaixo e erro próximo do campo.
- Seções de 24 a 32 px, com títulos descritivos.
- Ações no fim; em fluxos longos, barra sticky com “Voltar” e ação principal.
- Nunca usar placeholder como label.

### Tabelas

- Header sticky quando houver rolagem longa.
- Primeira coluna identifica a entidade; última concentra ações.
- Valores e ações não quebram linha. Texto longo usa truncamento com acesso ao conteúdo completo.
- Em mobile, priorizar lista estruturada ou ocultação explícita de colunas secundárias. Evitar tabela espremida.
- Paginação, quantidade e filtros pertencem ao mesmo bloco, com estado refletido na URL quando viável.

### Cards

Padding de 20 ou 24 px. Cards clicáveis têm affordance completa, foco visível e área inteira acionável. Não aninhar cards. Grids de métricas podem variar largura conforme importância, em vez de repetir seis cartões idênticos.

### Responsividade

| Faixa | Comportamento |
|---|---|
| 360 a 639 px | Uma coluna, ações full-width quando necessário, navegação em drawer, filtros em sheet |
| 640 a 767 px | Duas colunas seletivas, ações lado a lado, formulários ainda contidos |
| 768 a 1023 px | Sidebar compacta ou drawer conforme espaço real, cards 2 colunas |
| 1024 a 1279 px | Sidebar completa, tabelas e agenda amplas, cards 3 colunas |
| 1280 px ou mais | Densidade ideal e painéis lado a lado; limitar linhas de leitura |

## 8. Componentes principais

Todo componente interativo deve documentar e suportar: default, hover, focus-visible, active, disabled, loading e, quando aplicável, invalid/selected.

| Componente | Especificação |
|---|---|
| **Button** | Altura 40 px padrão e 44 px em booking; radius 8 px. Variantes `primary`, `secondary`, `outline`, `ghost`, `destructive` e `icon`. Um único primary por grupo. Loading preserva largura. |
| **Input** | Altura 44 px, padding 12 px, fundo `surface`, borda `border`. Focus com borda accent e halo de 3 px. Erro altera borda, adiciona ícone e mensagem. |
| **Select** | Mesma geometria do Input. Trigger mostra valor; menu indica seleção com check. Select nativo é aceitável em mobile quando melhorar usabilidade. |
| **Textarea** | Altura mínima 96 px, resize vertical e contador quando houver limite. |
| **Checkbox** | 18 px visual dentro de alvo mínimo 44 px. Label inteiro clicável. Estado indeterminate obrigatório para seleção em massa. |
| **Radio** | Usar para 2 a 5 opções mutuamente exclusivas visíveis. Cards selecionáveis apenas quando cada opção precisa de conteúdo rico. |
| **Switch** | Somente para efeito imediato liga/desliga. Configuração que exige salvar deve usar checkbox ou select. Sempre exibir label de estado. |
| **Card** | Surface + border; radius 12 px. Variantes `static`, `interactive`, `selected` e `critical`. Não elevar todo card no hover. |
| **Badge** | Altura 22 a 24 px. Variante semântica com label textual. Status de agenda possui vocabulário fixo. |
| **Avatar** | 32, 40 ou 48 px. Foto, iniciais ou ícone neutro; fallback determinístico e alt adequado. |
| **Sidebar** | Grupos por tarefa, item de 40 px, ativo com fundo `accent-subtle` e texto forte. “Admin Master” deve aparecer apenas por permissão e separado da operação da barbearia. |
| **Navbar/Header** | Marketing com CTA claro; produto mobile com menu, identidade e contexto mínimo. Não duplicar logout em vários pontos próximos. |
| **Table** | Linhas de 48 a 56 px, seleção opcional, ordenação comunicada por `aria-sort`, menu de ações por linha e cabeçalho sticky quando necessário. |
| **Modal/Dialog** | Para confirmação, decisão bloqueante ou edição curta. 480 px padrão; 640 px para formulário. Foco preso, `Esc`, título e descrição associados. Prefira página ou sheet para tarefas longas. |
| **Tabs** | Alternam visões equivalentes, não etapas. Indicador ativo por contraste e borda; setas de teclado suportadas. |
| **Dropdown** | Ações secundárias, largura mínima 180 px, itens 36 a 40 px. Destructive separado por divisor e cor. |
| **Calendar/Agenda UI** | Cabeçalho com data, navegação e “Hoje”. Colunas por profissional; slots com linha de tempo consistente. Reserva mostra cliente, serviço, duração e status. Conflitos nunca se sobrepõem silenciosamente. |
| **Stat Card** | Label, valor tabular, período e comparação quando real. Ícone é secundário. Cores variadas não devem ser usadas apenas para diferenciar cards. |
| **Empty State** | Título factual, explicação curta, uma ação principal e, quando útil, ação secundária. Ilustração é opcional. |
| **Page Header** | Breadcrumb opcional, título, descrição, metadados e slot de ações. Título do produto em 24 px. |
| **Section Container** | Título + descrição + ação contextual, seguido de conteúdo; pode usar divisor, não exige card. |
| **Pricing Card** | Nome, público, preço/período, benefícios comparáveis e CTA. Plano recomendado recebe superfície distinta, sem escala ou glow. |
| **Feature Card** | Benefício específico, texto curto e fragmento real do produto. Variar composição para evitar grid genérico repetitivo. |
| **Form Section** | Título, descrição, campos e feedback. Divide formulários longos por assunto, não por quantidade arbitrária. |
| **Toast/Notification** | Sucesso ou falha não bloqueante, até 5 s; título curto, descrição opcional e ação “Desfazer” quando possível. Erros que exigem correção permanecem inline. |
| **Loading State** | Skeleton imita a estrutura final. Spinner apenas dentro de botão ou operação pequena. `aria-busy` e texto para leitores de tela. |
| **Error State** | Explica o que falhou e como recuperar. Preserva dados digitados. Erro de página inclui tentar novamente e caminho seguro. |

### Vocabulário de status de agendamento

| Status | Token | Label | Ação seguinte típica |
|---|---|---|---|
| `pending` | warning | Pendente | Confirmar |
| `confirmed` | info ou accent | Confirmado | Concluir / Marcar falta |
| `completed` | success | Concluído | Ver detalhes |
| `cancelled` | destructive-muted | Cancelado | Reagendar |
| `no_show` | neutral-strong | Não compareceu | Reagendar / Registrar nota |

## 9. Padrões por página

### Landing page (`/`)

- **Objetivo visual:** posicionar o HeadBarber como produto confiável e demonstrar valor real.
- **Hierarquia:** proposta clara, prova do produto, benefícios, fluxo, prova social, planos e CTA final.
- **Componentes:** navbar, hero, product mockup, feature sections, pricing, FAQ e footer.
- **UX:** “Login” aponta para `/login`; “Começar” explica o próximo passo. Evitar CTAs duplicados com o mesmo destino e rótulos diferentes.
- **Responsividade:** texto antes do produto em mobile; fragmentos permanecem legíveis, sem screenshots minúsculos.
- **Futuro:** métricas verificáveis, depoimentos reais, comparação de planos e demonstração do booking.

### Login (`/login`)

- **Objetivo visual:** acesso confiável, sem distrações.
- **Hierarquia:** marca, título, instrução, campos, ação, recuperação/cadastro quando existirem.
- **Componentes:** auth shell, input, button, alert inline e links de suporte.
- **UX:** separar claramente modo de teste da experiência de produção. Nunca criar conta implicitamente sem consentimento em produção.
- **Responsividade:** card máximo 440 px e padding de 16 px; teclado não pode cobrir ação.
- **Futuro:** senha, magic link ou SSO conforme estratégia; mensagens de autenticação sem revelar existência de conta.

### Cadastro e onboarding (`/onboarding` e futuro cadastro)

- **Objetivo visual:** ativar a barbearia com esforço mínimo e progresso visível.
- **Hierarquia:** benefício, progresso, um assunto por etapa e próximo passo.
- **Componentes:** stepper, form section, slug preview, feedback e checklist de configuração.
- **UX:** gerar slug sem bloquear acentos no nome; permitir revisar. Após criar, orientar serviços, barbeiros e horários.
- **Responsividade:** uma coluna, ação sticky em telas pequenas.
- **Futuro:** salvar progresso, convite de equipe e checklist de ativação.

### Dashboard (`/dashboard`)

- **Objetivo visual:** responder “o que exige atenção hoje?”.
- **Hierarquia:** agenda de hoje e pendências antes de totais de cadastros; financeiro resumido depois.
- **Componentes:** PageHeader, stat cards, agenda preview, alerts e quick actions.
- **UX:** métricas mostram período e origem. “Agendamentos hoje” não deve ser placeholder silencioso.
- **Responsividade:** 1/2/3 colunas; lista prioritária permanece no topo.
- **Futuro:** ocupação, receita do dia, no-show, comparativos e ações personalizáveis.

### Agenda (`/dashboard/agenda`)

- **Objetivo visual:** permitir leitura e atualização rápida do dia por profissional.
- **Hierarquia:** data e navegação, filtros/profissional, grade temporal, detalhe da reserva.
- **Componentes:** calendar toolbar, timeline, booking block, status badge, dialog/sheet de detalhe e reserva manual.
- **UX:** manter posição após atualizar status; prevenir conflitos; mostrar duração e intervalos; walk-in deve usar os mesmos campos centrais do booking.
- **Responsividade:** desktop por colunas; mobile em agenda diária por lista ou profissional selecionado.
- **Futuro:** drag-and-drop somente com alternativa por teclado e confirmação de mudança, bloqueios e visão semanal.

### Reservas (`/dashboard/reservas`)

- **Objetivo visual:** pesquisar e administrar histórico completo.
- **Hierarquia:** título, busca/filtros, contagem, resultados, detalhe.
- **Componentes:** search, status filter, date range, list/table, badge e detail sheet.
- **UX:** filtros combináveis, estado na URL, limpar filtros visível e ações coerentes com o status atual.
- **Responsividade:** tabela em desktop, lista estruturada em mobile.
- **Futuro:** exportação, filtros salvos e auditoria de alterações.

### Clientes (`/dashboard/clientes`)

- **Objetivo visual:** localizar contato e contexto de relacionamento.
- **Hierarquia:** busca, novo cliente, lista, histórico/detalhe.
- **Componentes:** table, search, client form, empty state e confirmação de exclusão.
- **UX:** telefone em formato consistente; duplicidade avisada; exclusão explica impacto no histórico.
- **Responsividade:** nome e contato são prioritários; e-mail/data migram para detalhe no mobile.
- **Futuro:** perfil, frequência, gasto, preferências, consentimento e histórico.

### Serviços (`/dashboard/servicos`)

- **Objetivo visual:** manter catálogo, preço e duração confiáveis.
- **Hierarquia:** total/status, ação de criar, tabela e edição.
- **Componentes:** table, currency input, duration select/input, switch/status e dialog.
- **UX:** desativar é preferível a excluir quando há histórico; preço sempre formatado; duração afeta slots explicitamente.
- **Responsividade:** cards compactos ou tabela com nome/preço/status no mobile.
- **Futuro:** categorias, comissão específica, variação por profissional e buffers.

### Barbeiros (`/dashboard/barbeiros`)

- **Objetivo visual:** administrar equipe, disponibilidade e comissão.
- **Hierarquia:** equipe ativa, ação de criar, cards/lista, jornada de trabalho.
- **Componentes:** avatar, status, barber form, schedule editor e confirmação.
- **UX:** jornada merece sheet/página ampla, não dialog apertado. Comissão exibe unidade e impacto.
- **Responsividade:** cards em mobile; editor de horários em linhas empilhadas.
- **Futuro:** convite de acesso, serviços habilitados, folgas recorrentes e desempenho.

### Adicionais (`/dashboard/adicionais`)

- **Objetivo visual:** gerenciar extras que alteram preço e duração.
- **Hierarquia:** lista, preço, duração adicional e status.
- **UX:** deixar explícito que o adicional impacta o slot; distinguir de serviço principal.
- **Responsividade:** mesma família visual de Serviços para reduzir aprendizado.
- **Futuro:** compatibilidade por serviço e limite de quantidade.

### Produtos (`/dashboard/produtos`)

- **Objetivo visual:** catálogo e venda rápida sem confundir produto com serviço.
- **Hierarquia:** estoque/ativos, novo produto, catálogo, registrar venda.
- **Componentes:** product card/table, stock badge, sale dialog, client select e money input.
- **UX:** venda confirma item, quantidade, total e cliente opcional. Alertar estoque insuficiente.
- **Responsividade:** catálogo em lista; ação de venda permanece evidente.
- **Futuro:** estoque, custo, margem, código de barras e movimentações.

### Financeiro (`/dashboard/financeiro`)

- **Objetivo visual:** explicar receita, despesas, comissão e resultado sem ambiguidade.
- **Hierarquia:** período, receita, despesas, resultado, tendência, distribuição e extrato.
- **Componentes:** date range, metric blocks, chart acessível, breakdown, ledger table e dialogs de lançamento.
- **UX:** cada métrica define cálculo; moeda tabular; entradas e saídas usam sinal, label e cor. Estorno é diferente de exclusão.
- **Responsividade:** métricas 2 colunas no mobile; gráfico com resumo textual; extrato como lista.
- **Futuro:** fechamento, exportação, competência/caixa, permissões e trilha de auditoria.

### Configurações (`/dashboard/configuracoes`)

- **Objetivo visual:** tornar regras globais compreensíveis e seguras.
- **Hierarquia:** navegação local por assunto, seção atual, campos e salvar.
- **Componentes:** tabs/side nav, form sections, schedule blocks, alert e save bar.
- **UX:** indicar alterações não salvas; bloquear saída com mudanças; explicar efeito de lembrete e bloqueios.
- **Responsividade:** navegação local vira select; painéis lado a lado empilham.
- **Futuro:** branding do booking, notificações, equipe, segurança e integrações.

### Página pública de agendamento (`/booking/[slug]`)

- **Objetivo visual:** concluir reserva com confiança, no menor esforço possível.
- **Hierarquia:** barbearia, etapa atual, opções, resumo, ação seguinte.
- **Componentes:** stepper, service option, barber option, add-ons, date picker, time slots, customer form, summary e success state.
- **UX:** seis etapas devem permitir voltar sem perder dados. “Qualquer profissional” é escolha válida. Horários mostram fuso/data. Sucesso informa o que acontecerá e como reagendar/cancelar.
- **Responsividade:** resumo sticky no desktop e collapsible no mobile; CTA inferior respeita safe area.
- **Futuro:** branding por barbearia, política de cancelamento, pagamento/sinal, LGPD e link de gestão.

### Planos mensais (`/dashboard/planos-mensais`)

- **Estado atual identificado:** rota placeholder.
- **Direção:** separar assinatura SaaS de planos recorrentes oferecidos aos clientes. O título e o modelo de dados devem deixar isso inequívoco.
- **Futuro:** lista de planos, benefícios, cobrança, adesões, status, renovação e inadimplência.

### Admin Master (`/dashboard/admin-master`)

- **Estado atual identificado:** rota placeholder.
- **Direção:** superfície distinta, protegida por papel, com aviso de contexto global. Não misturar operações da plataforma com as da barbearia.
- **Futuro:** contas, planos, saúde da plataforma, suporte com impersonation auditada e logs.

## 10. Estados de interface

| Estado | Padrão |
|---|---|
| Loading | Skeleton estrutural após 300 ms; botão mantém label contextual e anuncia progresso. |
| Empty | Explica por que está vazio e oferece próximo passo. Empty por filtro difere de empty de primeira utilização. |
| Error | Mensagem humana, causa quando útil, recuperação e identificador técnico apenas em detalhes. |
| Success | Confirma ação e consequência. Toast para ação simples; página/estado dedicado para booking concluído. |
| Disabled | Opacidade moderada, cursor e sem interação; tooltip/ajuda explica o motivo quando não óbvio. |
| Hover | Mudança de cor/borda em 150 ms, sem deslocamento de layout. Hover nunca é a única indicação. |
| Focus | Halo de 3 px com `ring`, offset de 2 px e contraste mínimo 3:1. Usar `:focus-visible`. |
| Active | Feedback de pressão em 80 ms; pode reduzir brilho, não escala o layout. |
| Selected | Fundo `accent-subtle`, borda accent e indicador textual/ícone. |
| Skeleton | Mesma geometria do conteúdo, shimmer discreto ou pulse; respeita reduced motion. |
| Validação | Validar no blur ou submit, não a cada tecla para conteúdo incompleto. Resumo no topo em formulários longos. |

## 11. Motion e microinterações

- Botões e controles: cor/borda em 150 ms; feedback de press em 80 ms.
- Dropdown: fade + translateY de até 4 px, 150 a 200 ms.
- Dialog: overlay fade e painel com fade/scale de no máximo 0,98 para 1, em 200 a 280 ms.
- Sheet mobile: translate no eixo apropriado em 280 ms; gesto nunca substitui botão de fechar.
- Tabs: conteúdo troca sem coreografia; indicador move em até 200 ms.
- Cards: borda ou sombra discreta em hover. Não elevar cards estáticos.
- Sucesso: check simples ou mudança de estado; sem confete em tarefas rotineiras.
- Agenda: transições preservam referência espacial ao mudar dia ou status.
- Evitar bounce, elastic, parallax, sequência de entrada de página, animação infinita e propriedades que causam layout.
- Em `prefers-reduced-motion: reduce`, remover deslocamentos e reduzir durações para quase instantâneas.

## 12. Acessibilidade

- Cumprir WCAG 2.2 AA: texto normal 4,5:1; texto grande 3:1; componentes e foco 3:1.
- Ordem de foco acompanha a ordem visual. Não usar `tabindex` positivo.
- Toda ação funciona por teclado; dialogs prendem foco e devolvem ao gatilho.
- Labels têm associação programática; ajuda e erro usam `aria-describedby`.
- Campos inválidos usam `aria-invalid`; regiões de feedback usam `aria-live` conforme urgência.
- Ícones decorativos usam `aria-hidden`; icon buttons têm nome acessível.
- Alvo mínimo recomendado de 44 por 44 px; exceções precisam de espaçamento suficiente conforme WCAG.
- Status não depende apenas de cor. Combinar label, forma ou ícone.
- Calendário oferece entrada por teclado, data por extenso e estados indisponíveis anunciados.
- Gráficos têm resumo textual e tabela de dados alternativa.
- Telefones, moedas e datas usam formato local, sem sacrificar leitura por tecnologia assistiva.
- Zoom de 200% não pode perder conteúdo ou funcionalidade; 400% deve reorganizar em uma coluna quando aplicável.
- Imagens informativas têm alt; logos usam “HeadBarber”; fotos decorativas usam alt vazio.

## 13. UX Writing

### Tom de voz

**Direto, respeitoso, seguro e próximo.** O HeadBarber fala como um parceiro de operação experiente, sem jargão corporativo, entusiasmo artificial ou diminutivos.

### Regras

- Usar português brasileiro e sentence case.
- Começar botões com verbo: “Adicionar serviço”, “Salvar horários”, “Confirmar reserva”.
- Reservar “Excluir” para remoção real e “Desativar” para preservar histórico.
- Evitar “Ops!”, “Sucesso!” genérico e frases culpabilizadoras.
- Erro deve seguir: o que ocorreu + impacto + como resolver.
- Datas incluem contexto quando necessário: “Hoje, 20 jun, às 14:30”.
- Valores usam `R$ 120,00`; duração usa “45 min”.

| Contexto | Evitar | Preferir |
|---|---|---|
| Ação | Confirmar | Confirmar agendamento |
| Loading | Aguarde... | Salvando serviço... |
| Erro | Dados inválidos | Informe um celular com DDD. |
| Sucesso | Operação realizada | Horários de João foram salvos. |
| Empty | Nada aqui | Nenhuma reserva para este dia. |
| Destrutiva | Tem certeza? | Excluir “Corte premium”? Esta ação não pode ser desfeita. |
| Onboarding | Configure tudo | Cadastre um serviço para liberar seus horários. |

## 14. Do and Don't

| Faça | Não faça |
|---|---|
| Use champagne para seleção, foco e marca. | Use dourado em todo título, borda ou ícone. |
| Mantenha o dashboard light-first com dark mode equivalente. | Force dark mode por associação automática com “premium”. |
| Mostre dados reais e o período de cada métrica. | Exiba números placeholder como se fossem reais. |
| Use superfícies e divisores para criar grupos. | Transforme toda seção em card, especialmente cards aninhados. |
| Use fragmentos reais do produto no marketing. | Use ilustrações SaaS genéricas ou mockups impossíveis. |
| Prefira edição inline, página ou sheet conforme complexidade. | Abra modal para qualquer ação por padrão. |
| Use labels textuais em status e ícones Lucide. | Use emoji para Serviço, Barbeiro, Horário ou navegação. |
| Preserve dados após erro e explique recuperação. | Limpe formulários ou mostre código técnico ao usuário. |
| Use hover sem alterar layout. | Escale ou mova cards e botões de forma chamativa. |
| Escolha uma ação primária por região. | Mostre vários botões sólidos concorrendo por atenção. |
| Use feedback semântico consistente. | Use verde como cor de marca e de sucesso ao mesmo tempo. |
| Escreva para a tarefa atual. | Repita título em subtítulo ou use copy promocional no dashboard. |

### Decisões incorretas e correções

- **Incorreto:** card financeiro vermelho porque o valor caiu 2%, sem contexto. **Correto:** mostrar período, variação, direção, label e cor semântica acessível.
- **Incorreto:** seis stat cards idênticos com seis cores decorativas. **Correto:** priorizar agenda e pendências, agrupar cadastros secundários e usar cor apenas com significado.
- **Incorreto:** fluxo público com todos os seis passos e labels comprimidos no mobile. **Correto:** mostrar “Etapa 3 de 6”, nome atual e progresso compacto.
- **Incorreto:** excluir barbeiro com histórico. **Correto:** oferecer desativação; exclusão fica restrita a casos seguros e explica impacto.
- **Incorreto:** `glass`, glow e texto em gradiente para comunicar premium. **Correto:** neutros bem calibrados, bordas precisas, tipografia e conteúdo real.

## 15. Plano futuro de implementação

Este plano é deliberadamente documental. Cada fase deve gerar inventário, critérios de aceite, testes e migração incremental, sem reescrita total.

### Fase 1: tokens

- Auditar valores atuais de `globals.css`, Tailwind e componentes.
- Converter paleta semântica para CSS variables em light/dark, validando contraste.
- Registrar tipografia, spacing, radius, shadow, z-index, motion e breakpoints.
- Criar tabela de compatibilidade entre tokens atuais e novos.
- **Aceite:** nenhum valor visual crítico novo é hardcoded fora da camada de tokens.

### Fase 2: componentes base

- Normalizar Button, Input, Select, Textarea, Card, Badge, Dialog, Sheet, Table, Empty State e Page Header.
- Adicionar Checkbox, Radio, Switch, Tabs, Dropdown, Toast, Skeleton e estados de formulário.
- Criar documentação e testes de teclado/estados para cada componente.
- **Aceite:** todos os componentes essenciais cobrem default, hover, focus, active, disabled, loading e erro quando aplicável.

### Fase 3: layout global

- Reestruturar app shell, sidebar, header mobile, containers e padrões de página.
- Organizar navegação por grupos e permissão; separar Admin Master.
- Padronizar responsividade, foco do drawer e densidade.
- **Aceite:** navegação completa por teclado e ausência de overflow em 360, 768, 1024 e 1440 px.

### Fase 4: dashboard

- Migrar Dashboard, Agenda, Reservas, Clientes, Barbeiros, Serviços, Adicionais, Produtos, Financeiro e Configurações por fluxo.
- Começar por Agenda e booking, por serem o núcleo do produto.
- Padronizar status, dialogs/sheets, tabelas e formulários.
- **Aceite:** fluxos críticos mantêm regras de negócio e passam testes E2E existentes mais novos cenários visuais/teclado.

### Fase 5: páginas públicas

- Redesenhar landing, login, onboarding e booking público.
- Usar produto real na landing; alinhar branding configurável no booking.
- Validar performance, SEO, estados sem dados e conclusão de reserva.
- **Aceite:** booking completo em mobile e desktop, com recuperação de erro e sem perda de dados ao voltar.

### Fase 6: revisão visual com Impeccable

- Executar crítica por registro: marketing para landing; produto para dashboard e booking.
- Revisar hierarquia, densidade, tipografia, cor, conteúdo, edge cases e anti-padrões de aparência genérica.
- Corrigir inconsistências por componente, não com exceções locais.
- **Aceite:** nenhum desvio de alta severidade e justificativa registrada para exceções.

### Fase 7: testes visuais e responsividade

- Criar cenários Playwright para 360, 768, 1024 e 1440 px, light/dark e estados críticos.
- Adicionar regressão visual de componentes e páginas-chave.
- Testar teclado, leitor de tela, contraste, zoom, reduced motion e conteúdo extremo.
- Validar em dados vazios, loading, erro, nomes longos, moeda alta e agenda lotada.
- **Aceite:** zero regressões bloqueantes, WCAG 2.2 AA nos fluxos principais e baseline visual aprovado.

## Governança

- Este documento define intenção e contrato. Implementação deve vincular decisões a tokens e componentes aqui descritos.
- Mudanças de token ou comportamento compartilhado exigem registro de versão e impacto.
- Exceções locais precisam de justificativa de produto; preferência pessoal não é justificativa.
- A especificação legada `design-system/headbarber/MASTER.md` deve ser tratada como referência histórica durante a futura migração. Conflitos devem favorecer este documento após aprovação formal, especialmente em tema padrão, paleta, glassmorphism, motion e uso semântico de cor.
- Revisão recomendada: trimestralmente ou ao introduzir um novo domínio relevante, como pagamentos, assinaturas, estoque ou múltiplas unidades.

