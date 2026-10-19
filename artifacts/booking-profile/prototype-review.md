# Agendamento — correção pela referência

Cabeçalho substituído por voltar circular, etapa/título centralizados e sete segmentos. A primeira etapa agora combina banner, avatar sobreposto, nome, localização com Google Maps, cards fotográficos e botão Continuar em largura total. Dados de seleção, validações, ordem das etapas, horários e confirmação preservados.

Arquivos: booking-client.tsx, booking-progress.tsx, booking-shop-profile.tsx, booking-summary-bar.tsx e booking.module.css em src/app/booking/[slug]. Testes E2E e fixture ajustados somente ao novo texto Continuar e às verificações do cabeçalho.

Demo local: preenchidos os campos opcionais já existentes do perfil e avatar_url dos dois profissionais. Banner /brand/barbershop-auth.webp; avatar oficial /brand/headbarber_simbolo_duas_cores_transparente.png. Nenhuma configuração de cliente real ou de produção foi alterada. A interface identifica a barbearia como demonstração; retratos e endereço são ilustrativos. As configurações do dono continuam sendo a fonte desses campos para as demais barbearias.

Retratos criados com ImageGen, geração nova, sem imagens de referência: public/brand/demo/lucas.webp e public/brand/demo/marcos.webp. Prompts: retrato fotográfico de barbeiro brasileiro fictício, 32 anos, cabelo escuro penteado para trás, barba curta, avental preto, expressão profissional acolhedora; segundo retrato, 38 anos, cabelo escuro curto texturizado, barba cheia e óculos de armação escura. Em ambos: enquadramento de cabeça e ombros, barbearia escura com luz âmbar, pele realista, sem texto ou logotipo, explicitamente para uma demo fictícia. Originais PNG preservados no diretório de imagens geradas; derivados WebP de 240px utilizados no produto.

Validação: ESLint direcionado, TypeScript, build e todos os 17 E2E passaram. Inspeção real de 1440/768/390px, imagens carregadas, link Maps, sete segmentos, avanço/retorno, seleção preservada e ausência de overflow/erros de página. Impeccable detect retornou [] para progress, profile e CSS. Evidências: prototype-step1-1440.png, prototype-step1-768.png e prototype-step1-390.png; log completo prototype-all-e2e.log.

Adaptação explícita: sem moldura de telefone/status do sistema; nomes, marca e quantidade de profissionais vêm da barbearia real, portanto a demo tem dois profissionais, em vez dos quatro do exemplo. Nenhum percentual de fidelidade ou certificação WCAG é alegado. Sem push ou deploy.
