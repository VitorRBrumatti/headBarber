# Upload reutilizável de imagens com ImgBB

## Objetivo

Substituir os campos manuais de URL de imagem nos cadastros de barbeiros e
produtos por um upload reutilizável, seguro e com feedback visual. As imagens
cadastradas devem aparecer no agendamento público sem quebrar a interface quando
estiverem ausentes ou indisponíveis.

A entrega também corrige o topo e o indicador de progresso do agendamento:
resumo compacto no celular e trilha completa, centralizada e contida no desktop.

## Escopo

### Incluído

- Upload, preview, troca e remoção opcional de imagem em Barbeiros.
- Upload, preview, troca e remoção opcional de imagem em Produtos.
- Componente de upload reutilizável para futuros cadastros.
- Integração do servidor com a API v1 do ImgBB.
- Limite de 5 MB por arquivo.
- JPEG, PNG e WebP.
- Spinner e texto de carregamento durante o envio.
- Limite persistente de 10 tentativas a cada 10 minutos por usuário.
- Exibição das imagens e fallbacks no agendamento público.
- Correção do espaçamento superior do agendamento.
- Progresso compacto no celular.
- Trilha completa corrigida no desktop.
- Testes unitários, de contrato e de interface proporcionais à mudança.

### Excluído

- Imagens em Serviços.
- Imagens em Adicionais ou outros cadastros que não possuem imagem atualmente.
- Recorte ou edição avançada de imagem.
- Migração automática de imagens hospedadas em outros provedores.
- Garantia de exclusão do arquivo no ImgBB ao remover ou trocar uma imagem.

## Estado atual

- `barbers.avatar_url` e `products.image_url` já existem.
- Os formulários de barbeiro e produto recebem URLs manuais.
- O agendamento público já consulta esses campos e possui fallbacks parciais.
- Serviços não possuem e não receberão campo de imagem.
- O cabeçalho e o progresso do agendamento são fixos. A trilha de sete etapas
  extrapola algumas larguras e o conteúdo fica visualmente colado ao topo.

## Arquitetura

### Componente reutilizável

Um componente cliente `ImageUpload` será responsável por:

- aceitar clique e arrastar e soltar;
- restringir a seleção a JPEG, PNG e WebP;
- recusar arquivos acima de 5 MB antes do envio;
- mostrar preview local ou a URL já persistida;
- mostrar nome e tamanho do novo arquivo;
- exibir spinner, texto `Enviando imagem...` e estado acessível de progresso;
- bloquear troca, remoção e submissão enquanto o envio estiver ativo;
- permitir trocar ou remover a imagem;
- devolver ao formulário a URL pública ou `null`;
- manter uma mensagem de erro específica sem apagar a imagem anterior.

Os formulários continuarão enviando `avatar_url` e `image_url` às ações
existentes. URLs antigas permanecem compatíveis.

### Endpoint de upload

Uma rota autenticada do Next.js receberá `multipart/form-data` com um único
arquivo. O fluxo será:

1. validar sessão e obter a barbearia do perfil;
2. validar a origem da requisição;
3. validar presença e configuração de `IMGBB_API_KEY`;
4. validar tamanho, MIME declarado e assinatura binária;
5. consumir atomicamente a cota de upload no Supabase;
6. enviar o arquivo ao ImgBB via `POST multipart/form-data`;
7. aplicar timeout à chamada externa;
8. validar status, estrutura da resposta e URL HTTPS esperada;
9. devolver apenas os dados públicos necessários ao componente.

A chave será lida somente no servidor por `IMGBB_API_KEY`. Ela não usará o
prefixo `NEXT_PUBLIC_`, não será serializada ao cliente e não aparecerá em logs.

### Limite persistente

Uma tabela de tentativas de upload registrará:

- usuário;
- barbearia;
- instante da tentativa.

A tabela terá RLS ativa e não concederá acesso direto a `anon` ou
`authenticated`. Uma função restrita consumirá a cota:

- exige `auth.uid()`;
- confirma que a barbearia recebida corresponde ao perfil do usuário;
- serializa consumos concorrentes do mesmo usuário;
- remove registros antigos do próprio usuário;
- conta tentativas nos últimos 10 minutos;
- insere a nova tentativa somente quando o total for menor que 10;
- informa permissão ou bloqueio temporário sem expor dados de outros usuários.

Se a cota for excedida, a interface orientará o usuário a aguardar antes de
tentar novamente.

## Validação e segurança

- Limite do produto: 5 MB, embora o ImgBB aceite até 32 MB.
- Formatos aceitos: JPEG, PNG e WebP.
- SVG é recusado por permitir conteúdo ativo.
- GIF é recusado para evitar animação e custo desnecessário nos cards.
- O servidor não confiará somente na extensão ou no MIME enviado pelo navegador.
- Requisições sem sessão, sem barbearia ou de origem incompatível serão recusadas.
- A resposta externa precisará indicar sucesso e conter uma URL HTTPS válida do
  host esperado do ImgBB.
- A chamada externa terá timeout e mensagens internas serão convertidas em erros
  seguros em português.
- Arquivos, chave, URL de exclusão e corpo bruto da resposta não serão logados.
- Ações de salvar barbeiros e produtos continuarão filtradas pela barbearia.

## Ciclo de vida e limitações

O upload ocorre antes do salvamento final do cadastro para fornecer progresso e
preview imediatos. A URL retornada é então enviada no formulário.

Consequências aceitas:

- abandonar o formulário depois do upload pode deixar uma imagem órfã;
- trocar ou remover a imagem desvincula a URL do HeadBarber, mas não garante a
  exclusão do arquivo no ImgBB;
- a URL de exclusão retornada pelo provedor não será persistida em campos
  públicos nem enviada ao navegador.

Essas limitações serão tratadas como características conhecidas da API, sem
prometer exclusão remota não documentada.

## Integração nos cadastros

### Barbeiros

- Substituir o campo `Link do Avatar` pelo `ImageUpload`.
- Preservar `avatar_url` existente na edição.
- Manter imagem opcional.
- Exibir a imagem nos cards administrativos e no passo de profissionais do
  agendamento público.

### Produtos

- Substituir o campo `Imagem (URL)` pelo `ImageUpload`.
- Preservar `image_url` existente na edição.
- Manter imagem opcional.
- Exibir a imagem nos cards administrativos e no passo de produtos do
  agendamento público.

### Serviços

Nenhuma alteração de schema, formulário, tipo ou interface relacionada a imagem.

## Agendamento público

### Imagens

- Profissional: foto circular quando `avatar_url` existir; ícone como fallback.
- Produto: miniatura proporcional quando `image_url` existir; ícone como fallback.
- Falha de carregamento troca a imagem pelo fallback sem quebrar ou deslocar o card.
- Textos alternativos descrevem o conteúdo quando a imagem agrega informação.

### Topo e progresso

- O conteúdo principal terá padding suficiente para os dois elementos fixos.
- No celular, o progresso mostra `Etapa X de 7`, nome atual e barra curta.
- No desktop, os sete passos ficam dentro de um contêiner com a mesma largura
  máxima do conteúdo, com círculos, conectores e rótulos equilibrados.
- Nenhum elemento deverá criar rolagem horizontal na página.
- A mudança de etapa continuará rolando a página para o topo útil do conteúdo.

## Estados de erro

- Arquivo ausente: `Selecione uma imagem.`
- Tipo inválido: `Use uma imagem JPEG, PNG ou WebP.`
- Tamanho inválido: `A imagem deve ter no máximo 5 MB.`
- Sessão inválida: solicitar novo login.
- Limite excedido: informar espera antes de uma nova tentativa.
- Provedor indisponível ou timeout: permitir tentar novamente sem apagar a URL
  anterior.
- Configuração ausente: erro seguro para o usuário e diagnóstico sem segredo no
  servidor.
- Resposta inesperada: erro genérico, sem repassar conteúdo externo.

## Estratégia de testes

### Unidade

- tamanho máximo e arquivo acima do limite;
- MIME e assinaturas válidas de JPEG, PNG e WebP;
- extensão ou MIME incompatível com a assinatura;
- SVG, GIF e conteúdo arbitrário;
- normalização e validação da resposta do ImgBB;
- timeout e erros seguros;
- regra de host HTTPS.

### Banco e segurança

- usuário sem sessão não consome cota;
- usuário não consome cota de outra barbearia;
- até 10 tentativas na janela são aceitas;
- a décima primeira é recusada;
- concorrência não ultrapassa o limite;
- registros antigos deixam de contar;
- tabela não é acessível diretamente por `anon` ou `authenticated`.

### Componentes e contratos

- estado vazio e imagem já persistida;
- preview local;
- spinner e controles bloqueados;
- sucesso, erro, nova tentativa, troca e remoção;
- formulários enviam a URL retornada ou `null`;
- URLs antigas continuam compatíveis;
- Serviços permanecem sem suporte a imagens;
- agendamento renderiza fotos e fallbacks;
- quebra da imagem aciona o fallback;
- progresso mobile e desktop obedecem ao contrato responsivo;
- conteúdo não fica sob os cabeçalhos fixos.

### Verificação final

- testes unitários e de banco;
- lint;
- build de produção;
- teste visual responsivo do agendamento em celular e desktop;
- teste manual do upload real usando a chave local.

## Configuração

Adicionar à documentação de ambiente:

```dotenv
IMGBB_API_KEY=
```

O valor real será mantido somente em `.env.local` e nunca será versionado.

## Critérios de aceite

- Barbeiros e Produtos aceitam upload de até 5 MB em JPEG, PNG ou WebP.
- O upload apresenta spinner e não permite salvar um estado incompleto.
- A chave do ImgBB não aparece no navegador, bundle, logs ou repositório.
- O limite de 10 tentativas por 10 minutos funciona de forma persistente.
- URLs antigas continuam funcionando.
- Remover uma imagem salva `null` no cadastro.
- Imagens disponíveis aparecem no agendamento; ausentes ou quebradas usam fallback.
- Serviços continuam sem campo de imagem.
- O agendamento tem espaçamento correto no topo.
- O progresso mobile é compacto e o desktop não ultrapassa a largura da tela.
- Não existe rolagem horizontal causada pelo progresso.

## Referência externa

- ImgBB API v1: <https://api.imgbb.com/>
