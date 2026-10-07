# Etapa 2 — CNAE geral, 07/10/2026

Empresas e Sócios no modo Mapa compartilham `CnaeReceitaDialog`. A abertura
lê somente uma página Receita com dez itens. Busca envia `descricao` e reinicia
a página; anterior/próxima usam `page`, sem download integral ou busca local.
Não existe novo parâmetro API: código exato é adicionado explicitamente e sua
existência é validada pela consulta CNPJ ao aplicar. Códigos conservam zeros.

Seleções atravessam buscas/páginas. Confirmar transfere somente para o rascunho;
Cancelar/Escape descartam edição interna. Limpar no diálogo limpa a edição.
Há remoção individual, contador e erro de limite 100 sem truncamento. Resumo
externo conserva códigos e descrições escolhidas durante a sessão; descrições
não consultadas de URLs são identificadas, sem inventar busca por código.
Aplicar continua sendo a única submissão empresarial e reinicia a página.

IBGE/CONCLA fica dentro do diálogo, identificado como consulta auxiliar. Os
controles anteriores de publicação, hierarquia, correspondências e paginação
permanecem. Apenas subclasses literais entram na edição; sem expansão ou
conversão. A descrição Receita não é substituída por IBGE. Código ausente na
Receita conserva a seleção diante do erro empresarial.

`useActivityCapability` consome apenas `secondary_available` do endpoint
existente. A apresentação de segmentos é separada e resolvida sob demanda.
Escopo secundário na URL ou na submissão fica bloqueado sem capacidade publicada.
Certificação de release continua sendo responsabilidade da API, inclusive na
validação final de cada consulta; o cliente não deduz disponibilidade do IBGE.

URLs `segmentos` ficam bloqueadas até resolução e confirmação explícita dos
códigos/versão. Versão divergente ou segmento desconhecido exige remoção/correção.
Após revisão, Aplicar envia `cnaes`/`atividade_escopo` sem segmentos/versão.
URL `cnae` isolada oferece normalização explícita para principal, conservando
literal, território, filtros e `return_to`; conflitos não são normalizados.
Os campos textuais duplicados foram removidos das duas interfaces Mapa.

Diálogo nativo modal com título, foco inicial, contenção de Tab/Shift+Tab,
Escape e retorno explícito ao acionador. Enter em inputs não submete o
formulário empresarial. Checkbox possui CSS próprio limitado ao diálogo.

Validação usa somente mocks/interceptação. `e2e/cnae-general.pw.ts` bloqueia
tráfego externo e cobre ambas as áreas em 375/1440 px, zero chamadas empresariais
durante edição, busca remota, seleção entre páginas, reabertura, Escape,
limpeza descartada, foco e paridade mapa/lista após aplicar. Testes unitários
cobrem limite, erro Receita, IBGE, URLs antigas, secundárias e regressões da
Etapa 1, incluindo cancelamento, conclusões tardias e paginação aplicada.

Resultados locais: suíte completa serial com 283 testes em 27 arquivos aprovada;
após os últimos ajustes, rodada focada com 88 testes em seis arquivos aprovada,
incluindo dois casos adicionais de segmento desconhecido/versão divergente.
Chromium: quatro cenários aprovados (duas áreas × dois tamanhos), incluindo
contenção de Tab/Shift+Tab e retorno de foco. Build `tsc --noEmit` + Vite e
`git diff --check` aprovados. A primeira rodada Chromium revelou retorno de
foco incorreto no ciclo de efeitos; a referência explícita ao acionador corrigiu
o problema. Um teste anterior do catálogo IBGE foi adaptado à abertura/confirmar
do novo diálogo. O domínio municipal foi acrescentado às fixtures do navegador.

Fixtures comprovam comportamento do cliente; não comprovam desempenho,
compatibilidade operacional ou cancelamento SQL. Sem HTTP operacional, banco,
benchmark ou carga. A implementação inicial terminou sem commit/sincronização;
o fechamento Git foi autorizado posteriormente pelo usuário. Etapas 3/4 não
implementadas; Etapa 5 e aceite operacional Fase 6 permanecem pendentes.

Na revisão de fechamento, os testes antigos de navegador foram adaptados à
aplicação explícita e ao novo diálogo; o catálogo auxiliar deixou de anunciar
sucesso quando a adição é recusada e passou a conservar sua descrição publicada,
identificada como IBGE/CONCLA, sem substituir descrições Receita já selecionadas.

Limpeza autorizada: retirados os prompts concluídos da Etapa 2 e da implementação
inicial Fase 6, além do prompt de medição municipal ampla anterior à política
atual. Referências atualizadas para entregas/contratos e para o prompt da Etapa 3.
Os demais prompts API conservam requisitos/handoffs ainda úteis; o prompt de
fechamento Fase 6 conserva o aceite operacional pendente. Removidos localmente
quatro diretórios de medição antigos: três com conexão recusada e uma amostra
de timeout repetida. Preservados `20261001T180515_034420Z` (evidência operacional
mais recente) e `20261006_browser` (arquivo histórico de navegador).

Fechamento validado: 286 testes unitários em 27 arquivos aprovados, suíte completa
Chromium com 22 cenários aprovada em 2,2 minutos, build de produção e checagem
de whitespace aprovados. Os timeouts locais iniciais do cenário IBGE foram
registrados; sua navegação de proveniência foi tornada explícita e o prazo desse
único cenário foi ajustado para 60 s, sem retry ou alteração de chamadas
operacionais. Os cenários já existentes voltaram a passar com o contrato atual.
