# Perfil inicial, estados padrão e botões

- Botões do rodapé de agendamento compartilham altura mínima de 54px e raio de 12px. Continuar, Avançar e Confirmar usam o mesmo dourado; Voltar mantém aparência secundária com o mesmo arredondamento. Navegação e validações preservadas.
- Sem endereço, não há bloco de localização nem link Maps. Sem avatar, as duas primeiras iniciais aparecem em dourado sobre preto. Sem banner, aparece o anexo fornecido, otimizado em `public/brand/booking-default.webp`; a imagem original não foi modificada. O limite real do uploader continua em 5 MB.
- Imagens quebradas também recebem as alternativas. Foi corrigida a detecção de erro que ocorre antes da hidratação no componente compartilhado ImageWithFallback.
- Após o nome da barbearia, o cadastro segue para `/onboarding/profile`, antes do painel. A conta já vinculada à barbearia pode reutilizar o uploader, sua quota e a ação existente de Perfil público. Foto, banner e endereço são opcionais. Há opção Configurar depois; Configurações → Perfil público permanece disponível.
- O middleware mantém autenticação e assinatura; a nova rota inicial fica disponível ao dono. A página valida papel e vínculo, a ação revalida dono/tenant e demos continuam bloqueadas. Sem mudanças em RLS, banco, pagamentos, contratos de API ou produção.

Arquivos principais: onboarding/page.tsx; onboarding/profile/page.tsx e profile-client.tsx; dashboard/configuracoes/booking-profile-form.tsx; utils/supabase/middleware.ts; components/ui/image-with-fallback.tsx; booking/[slug]/booking-shop-profile.tsx, booking-summary-bar.tsx e booking.module.css. Testes adicionados em onboarding-profile.spec.ts e ampliados em booking-profile.spec.ts. Dois contratos unitários antigos foram atualizados para o cabeçalho segmentado já solicitado anteriormente.

Validação final: 267 testes unitários e 20 E2E passaram; ESLint direcionado, TypeScript e build passaram. O E2E cria uma barbearia, salva imagens/endereço, verifica edição posterior, testa campos opcionais vazios, falha de imagem antes da hidratação e bloqueio para não autenticados/barbeiros. Uploads externos foram simulados, sem custos de provedor; não foi testado envio real ao ImgBB nesta alteração.

Comparação computada no navegador confirmou o mesmo fundo e raio em Continuar/Avançar e raio compatível em Voltar. Capturas de desktop e mobile: defaults-1440/390.png, rounded-buttons-1440/390.png e initial-profile-1440/390.png. Sem overflow nas larguras inspecionadas. Impeccable detect retornou [] nos quatro arquivos de apresentação examinados; não representa certificação completa de acessibilidade.

Logs: defaults-unit.log, defaults-e2e.log e defaults-build.log. Sem novas dependências e sem deploy.
