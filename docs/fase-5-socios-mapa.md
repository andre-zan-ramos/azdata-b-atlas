# Fase 5 — Modo Mapa de Sócios

Implementação exclusiva da Fase 5 de `contrato-modos-busca-mapa.md`.
Contrato da API: `azdata/api/docs/cnpj-socios-mapa-contract.md`.

## Consumo e navegação

`/receita-federal/cnpj/socios?modo=mapa` chama somente a consulta cartográfica
`socios/mapa/` e a lista paginada `socios/mapa/resultados/`. Não monta o
universo por páginas e não consulta detalhes por ponto.

Parâmetros de URL: `modo`, `q`/`q_modo` opcionais, `uf`, `municipio`
(Receita), `cnpj_basico`, `cnae`, `situacao_cadastral`, `matriz_filial`, `porte`,
`natureza_juridica`, `page` e `return_to`. Não há viewport persistido.
Cliques territoriais e seleções aplicam a consulta imediatamente e reiniciam
a página; IBGE → Receita usa exclusivamente a ponte oficial do endpoint.
Ponte ambígua não é resolvida pelo cliente.

A unidade é relação participação/estabelecimento, preservada em mapa/lista.
Só o estabelecimento possui geolocalização. Co-localização reúne visualmente
os itens retornados no mesmo marcador, com todos os itens no popup e contagem
explícita; não deduplica sócios, homônimos, documentos ou participações.
O resumo declara totais, relações sem coordenadas, limite, máximo, truncamento,
filtros efetivos e compatibilidade de publicação. Sem compatibilidade entre
release/filtros da lista e do mapa, os pontos ficam ocultos com aviso explícito.

Links do popup e da tabela abrem participação por ID/release, estabelecimento
por CNPJ completo e empresa por CNPJ básico, preservando `return_to` integral.
O detalhe técnico apresenta apenas a participação selecionada; não afirma
representar o grupo inteiro ou uma identidade civil. Não usa busca nominal
para localizar a participação. O fluxo anterior de Busca mantém seu contrato.

Requisições recebem `AbortSignal`, não fazem polling nem retry automático.
Geolocalização não é solicitada nesta fase. Falha cartográfica não elimina
os resultados textuais; pontos só são exibidos após confirmar compatibilidade
com a lista.

## Validação isolada em 2026-10-01

- API CNPJ: 59 testes passaram, usando banco SQLite de teste em memória.
- B-Atlas: 184 testes passaram em 19 arquivos, com `--maxWorkers=1`.
- Builds B-Atlas e API web passaram; build da API web verificou mojibake.
- UTF-8/mojibake nos arquivos alterados e `git diff --check` dos dois
  repositórios passaram. Os dois diffs e os arquivos novos foram revisados.
- Casos cobertos: identidades técnicas, zeros, documentos null/vazios,
  homônimos/duplicatas, pares múltiplos, exclusões de coordenadas inválidas,
  imprecisas, incompatíveis, obsoletas e de release distinta, contagens,
  truncamento, filtros, paginação com count null e com contagem explícita,
  mudança de release, ausência de escritas/produtor em GET, navegação,
  histórico, ponte territorial, ausência de cascata e regressão de Busca.
- A suíte conjunta CNPJ/CNO revelou uma falha anterior em
  `CnoApiTests.test_static_openapi_matches_response_fields`: o teste espera
  sete paths, mas o OpenAPI publicado contém oito. Ambos os valores foram
  confirmados no HEAD original da API (20a73c3); o teste/contrato CNO não foram
  alterados nesta fase.

Não houve validação visual em navegador nem medição de desempenho em
PostgreSQL. Não foram executadas migrations, cargas, comandos de índices,
operações no banco compartilhado, commit ou push. Recortes nacionais podem
exigir tempo elevado para contagem/varredura, conforme o contrato da API.
Fase 6 permanece fora de escopo.

Prompt da próxima thread: `docs/prompt-fase-6-busca-mapa.md`.
