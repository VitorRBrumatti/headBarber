# Login, cadastro, demo e plano anual

Atualização: a indisponibilidade local descrita abaixo foi resolvida. Foram aplicadas somente no Docker local as quatro migrações existentes de demo (base, segurança, fuso e correção de login), restauradas as permissões administrativas necessárias ao provisionador e criada a conta descartável com o script oficial. Credenciais locais ficam em arquivo ignorado pelo Git; a prévia as carrega automaticamente. Navegador confirmou os dois destinos reais e uma tentativa de editar serviço foi bloqueada com 42501. Capturas: `demo-booking-working.png` e `demo-dashboard-working.png`. Nenhum arquivo de autenticação, política RLS ou migração foi modificado; produção não foi alterada.

## Resultado

- Login/cadastro seguem as referências: painel fotográfico escuro, formulários claros, identidade preta/dourada e inversão lateral ao alternar entre os modos. Sem a alegação de “+10.000 barbeiros”, avatares ou depoimentos fictícios.
- Painéis trocam de lado em 850 ms com curva cubic-bezier(.76, 0, .24, 1); formulário entra em 650 ms com GSAP power3.out, deslocamento de 24 px e rotação de 4 graus. No celular os painéis empilham. Movimento reduzido elimina ambas as animações.
- Formulários inativos deixam de existir no DOM: não recebem foco nem validação acidental. Valores continuam preservados no estado React ao alternar. Campos possuem autocomplete e labels; mensagens usam alert/status.
- Plano anual tem borda dourada com variação contínua de opacidade em 4 segundos, sem deslocar preço, texto ou botão. Prefers-reduced-motion desativa o ciclo e mantém a borda estática.
- Demo mantém seus dois destinos, formulário POST, apresentação de erro e restrições existentes. Capturas reais do produto substituem os mockups fictícios da referência.

## Arquivos

Modificados: `src/app/login/page.tsx`, `src/app/demo/page.tsx`, `src/app/landing-pricing.tsx`, `src/app/landing.module.css`.

Criados: `src/app/login/auth.module.css`, `src/app/demo/demo.module.css`, `public/brand/barbershop-auth.webp`, `tests/e2e/auth-presentation.spec.ts`. Evidências e script de inspeção nesta pasta.

Nenhuma dependência adicionada nesta alteração. GSAP já instalado foi reutilizado. Skills aplicadas: Impeccable (craft/audit), GSAP React/core e Ponytail. Impeccable detect retornou `[]` para os cinco arquivos de interface examinados; isso não representa certificação automática de estética ou WCAG.

## Preservação funcional e testes

Os handlers de senha, cadastro, Google e OTP foram comparados ao arquivo anterior e permanecem idênticos. Captura de erro de URL preservada com agendamento cancelável para satisfazer o lint. Sem mudança em banco, RLS, rotas de autenticação, pagamentos ou regras de negócio.

ESLint direcionado, TypeScript e build passaram. 267 testes unitários passaram. Os três novos E2E passaram: login real em Supabase local; alternância/validações/contrato de cadastro; erros/OTP/controles da demo. Cadastro e OTP usam respostas interceptadas, sem enviar e-mails reais. A suíte E2E completa passou: 17 testes em 1,5 minuto; registro em `e2e.log`.

Inspeção real em 1440, 768 e 390 px, com capturas de login/cadastro/demo: sem overflow horizontal ou erros de página. Troca lateral foi verificada por coordenadas antes/depois. Movimento reduzido e ativação do ciclo anual foram verificados por estilo computado. Capturas anteriores de login e demo estão em `before-*.png`.

## Limitações existentes

A demo não está provisionada no banco local: `/booking/headbarber-demo` retorna 404; POST de mesma origem em `http://localhost:3002/auth/demo` retorna 303 para `/demo?error=unavailable`. A checagem de origem e a autorização foram preservadas. Não foi alterada configuração de produção para resolver a prévia. Usar o hostname `localhost` da prévia, pois a verificação existente diferencia `localhost` de `127.0.0.1`.

Google OAuth e entrega real de e-mail não foram executados contra serviços externos. Links de Termos de Uso/Privacidade continuam com `href="#"`, como antes; não existem páginas legais no projeto. A fotografia é ambiente ilustrativo gerado por IA; não é foto de um parceiro real. Não houve push ou deploy.

## Asset gerado

ImageGen, geração guiada pelo anexo `codex-clipboard-e783cfd7-e2b6-4a1b-b455-ec30498dcb74.png`. WebP final com aproximadamente 109 KB.

Prompt: Create only a photorealistic barbershop interior background photograph inspired precisely by the LEFT photographic panel of this reference. NO text, NO logo, NO UI, NO people. Wide 16:9 landscape. Premium black leather barber chair with polished dark metal armrests occupies right third, mirror and vertical amber warm light strips, folded towels and shelves behind it, subtle plants, dark wooden floor. Left half mostly deep black shadows with subtle interior detail so white marketing text can be placed on top later. Cinematic restrained warm amber lighting, elegant real materials, exactly this black and warm gold mood. Chair clearly visible, full seat and back. Not a mockup.
