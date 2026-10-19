# Parceria — referência Hoffmann’s Barber

Implementação: composição preta e dourada, marca tipográfica, divisor vertical, título e texto em HTML, fachada gerada com ImageGen e otimizada para WebP. O logo original continua preservado nos assets. Nenhuma dependência adicionada.

Modo: ImageGen, geração guiada pelo anexo `codex-clipboard-71bb0960-6ff9-43be-8f88-c5ac4bfcf4a9.png`.

Prompt: Create a photorealistic cinematic architectural background image matching the attached reference's storefront faithfully. Output a wide landscape 3:2 photograph of ONLY the facade on the RIGHT SIDE of the reference, no marketing text, no left wordmark, no divider. Elegant traditional Hoffmann’s Barber storefront at night, dark black paneled wood facade, warm amber wall lanterns, black framed glass double doors, realistic barber chairs and shelves visible inside, leafy potted plants flanking entrance, stone pavement, luminous serif storefront sign exactly 'Hoffmann’s' with small 'BARBER' below. Match the same front-on slight angle, framing, refined amber lighting and deep charcoal shadows. Storefront occupies right 80%, left edge fades naturally into almost black shadow, leave roof/sign and pavement visible. No people, no extra logos, no collage, no UI. This is an explicitly requested imagined AI facade, not a documentary photograph. High quality realistic materials and restrained lighting.

Asset: `public/brand/partners/hoffmanns-facade-ai.webp`. Fachada ilustrativa, não representa o imóvel real. A arquitetura e a tipografia são aproximações da referência; não se afirma igualdade de pixels.

Validação: dois testes unitários da parceria/sidebar passaram; ESLint dos dois arquivos TypeScript passou; build local passou. Playwright verificou imagem carregada, ausência de overflow em 1440/768/390 e ausência de erros de página. Capturas nos arquivos `partner-1440.png`, `partner-768.png`, `partner-390.png`.

Revisão visual: composição desktop comparada ao anexo; mobile empilha a marca e o texto acima da fachada. Sem cards adicionais, ícones decorativos, glow ou motion desnecessário. Escopo restrito à parceria; regras do agendamento não foram alteradas. Não houve push ou deploy.
