# Perfil público do agendamento — revisão Impeccable

2026-10-17. Escopo: nova aba após Bloqueios Excepcionais; perfil da barbearia e fotografias dos profissionais na etapa 01; apresentação de datas/horários da etapa 05.

## Implementação

- Perfil público: banner, foto de perfil e endereço opcionais, configurados pelo dono. Reutiliza ImageUpload e o endpoint de upload existente; nenhuma dependência nova.
- Persistência: três colunas opcionais em barbershops. A action usa o usuário autenticado e o tenant da sessão, exige owner, impede edição da demo, valida tamanho/tipo/host das URLs e não recebe o ID da barbearia do navegador.
- Endereço: busca oficial do Google Maps com query codificada, em nova aba com noopener/noreferrer. Sem API, chave ou geocodificação paga. O dono pode conferir o resultado antes de salvar.
- Fotografias dos barbeiros: continuam sendo as imagens reais do cadastro de profissionais; não foram criadas pessoas ou avaliações fictícias.
- Fallbacks: imagens ausentes ou inválidas não quebram a tela. Nome da barbearia permanece disponível; endereço ausente não produz link falso.
- Etapa 05: mesmas datas, slots, regras de disponibilidade e handlers. Melhorias em contornos, espaçamento, seleção dourada e aria-pressed; corrigida a exibição do mês que mostrava a preposição “de”.
- Abas: roving tab index, setas, Home e End. Salvamento bloqueado durante upload e durante o envio da configuração. Campos preservados em falhas de salvamento.

## Revisão visual real

Aplicadas as orientações Impeccable 4.3.1 (audit/craft-floor) e a direção já aprovada. Inspeção de capturas em 1440, 768 e 390 px, incluindo configuração, etapa 01 e etapa 05. Dois ciclos: captura inicial, correções em lote e confirmação. O detector mecânico retornou `[]` (impeccable.json); isso não constitui certificação de acessibilidade ou garantia estética automática.

Achados corrigidos:

- **P1:** seleção do horário podia mostrar texto escuro enquanto o fundo ainda transitava de escuro para dourado; seleção agora é imediata. Há asserção da cor final no navegador.
- **P2:** mês era extraído como “de” da data localizada; foi corrigida apenas a apresentação, preservando o valor ISO e os cálculos de disponibilidade.
- **P2:** fotografias dos profissionais pequenas para a referência; ampliadas para 88 px com recorte consistente e fallback equivalente.
- **P2:** abas sem navegação por setas; adicionada e testada navegação por teclado.

Integridade visual: cada bloco tem função direta (identificação, localização ou escolha). Sem estrelas, avaliações, números inventados, glow, glassmorphism, ilustrações genéricas ou animação decorativa. Cards de profissionais representam escolhas reais, conforme a referência. Nenhum novo motor de motion foi incluído.

Não foram encontrados problemas críticos conhecidos no fluxo novo inspecionado. Não se afirma pixel accuracy global, conformidade WCAG integral ou pontuação de performance. Não houve medição Lighthouse.

## Evidências e testes

Resultado final: **267 testes unitários (59 arquivos) e 14 E2E aprovados**. ESLint direcionado a todos os arquivos alterados neste pedido, TypeScript e build aprovados. O lint global não foi repetido: a execução anterior incluía milhares de problemas de tooling e código fora deste escopo.

Contrastes calculados pela fórmula WCAG de luminância relativa sRGB, usando as cores do CSS: texto selecionado #17130d sobre #d6b475 = **9,38:1**; texto secundário #c1bcb2 sobre #191a19 = **9,23:1**; texto principal #f6f2e9 sobre #0c0d0d = **17,42:1**. Esses pares não equivalem a uma auditoria completa WCAG.

- `before-step-{1,5}-{1440,768,390}.png`: capturas da versão anterior preservadas.
- `settings-{1440,768,390}.png`, `step-1-{1440,768,390}.png`, `step-5-{1440,768,390}.png`: configuração e fluxo renderizados.
- `empty-profile-390.png`: remoção dos campos e fallback.
- `preview-390.png`: build de produção local, sem mocks de rede, com assets locais existentes e dados explicitamente demonstrativos.
- `../booking-profile-unit.log`: suíte unitária.
- `../booking-profile-all-e2e.log`: suíte E2E completa.
- `build.log`: build final com Supabase local.

No teste de upload, a resposta do provedor externo é simulada para não consumir cota ou publicar arquivos. O salvamento/recarregamento e o acesso anônimo usam o banco local real; o componente/validação/rota de upload continuam cobertos pela suíte existente. Foram verificadas seleção, avanço, persistência, remoção, imagens carregadas, ausência de overflow nas três larguras e ausência de erros JavaScript no cenário novo.

## Ambiente e publicação

Migração nova: supabase/migrations/20261017150000_public_booking_profile.sql. Aplicada somente no Docker local. O schema local também recebeu a coluna demo_mode da migração já existente de 2026-08-17, ausente no banco de testes e responsável pelos redirecionamentos de login anteriores. Nenhuma fonte de autenticação ou política RLS foi alterada.

Três testes antigos foram atualizados para a interface já existente: localização de headings de barbeiros, cards de produtos sem a antiga classe group e ativação do switch por teclado. As verificações de comissão, estoque, venda e assinatura foram preservadas; não foram desabilitados testes nem afrouxadas as asserções funcionais.

O Supabase hospedado e .env.local permanecem intactos. Antes de disponibilizar a funcionalidade no ambiente hospedado, será necessário aplicar a migração nova e publicar o código. O agendamento continua compatível com o schema antigo durante essa transição. A prévia em localhost:3002 usa exclusivamente o banco local.
