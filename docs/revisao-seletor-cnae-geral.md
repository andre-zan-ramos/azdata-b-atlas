# Revisão do seletor geral Receita — 11/10/2026

Escopo exclusivo B-Atlas. Contratos lidos localmente no checkout API:
`cnpj-dominio-cnae-revisao.md`, `openapi-cnpj-b2b-v1.json` e
`cnpj-filtros-b2b-implementacao.md` (handoff informado: `3ea30f0`).

## Diagnóstico

O campo principal `CnaeMultiselect`, compartilhado por Empresas e Sócios no
modo Mapa, já satisfaz o contrato geral. Não foi necessária alteração funcional.
Abre apenas uma página de `dominios/cnaes/`, pesquisa remotamente por `descricao`
e usa `page`/`page_size=10`. `next` e `previous` habilitam a navegação. Texto
numérico continua sendo descrição, sem busca exata por código. Opções preservam
`codigo` string e `descricao` Receita literais; os quatro segmentos editoriais
não restringem opções. Não há catálogo paralelo, download integral ou expansão
por prefixo/nome comercial. A ordem por código não garante snapshot entre páginas.

Seleções permanecem no draft ao pesquisar, paginar e fechar/reabrir. Apenas
Aplicar grava filtros novos na URL e consulta mapa/resultados; URLs completas
previamente aplicadas podem restaurar consultas. Ambas as áreas exigem UF válida
e CNAE e/ou período válido; município, quando informado, precisa pertencer à UF
no domínio Receita. Datas inválidas/invertidas e parâmetros repetidos bloqueiam.
Busca textual conserva seu contrato próprio, fora deste seletor de Mapa.

São enviados somente códigos selecionados e escopo. Há limite de 100 explícitos,
sem truncamento. O limite de 200 após expansão é validado pela API; o campo
principal não expande segmentos. Erros empresariais são exibidos e preservam a
seleção. Pontos dependem de compatibilidade de release, filters e b2b_context
com os resultados; dados textuais permanecem disponíveis diante de divergência.

`segmentos/` continua sendo a autoridade de `secondary_available`. Pendente,
erro ou false bloqueiam secundárias, inclusive em URL completa. O erro da
capacidade é exibido explicitamente; a API revalida a certificação da release
carregada. IBGE/CONCLA é independente e não habilita secundárias nem substitui
descrições Receita. `Demais consultas` mantém controles montados ao recolher,
preservando valores e resumo aplicado separado do estado draft.

## Compatibilidade das URLs

Nenhum parâmetro foi removido nesta revisão. Inventário atual:

| Parâmetros | Transição existente e explícita |
| --- | --- |
| `cnaes`, `atividade_escopo` | Restauram seleção; só códigos seguem ao CNPJ. Descrições de URL não consultadas são identificadas como desconhecidas. |
| `cnae` isolado | Consulta bloqueada até normalização explícita para `cnaes` e principal. Conflitos permanecem bloqueados. |
| `segmentos`, `catalog_version` | Preservados até revisão sob demanda de IDs/versão/códigos. Confirmação altera draft; Aplicar envia códigos. Versão divergente ou ID desconhecido exige correção explícita. |
| território, período, demais filtros, `return_to` | Preservados na aplicação/revisão conforme contrato; página reinicia em 1. |

As descrições exibidas na revisão de segmentos são referências editoriais da API,
não uma consulta ao domínio Receita. Essa rota antiga não fabrica descrições
Receita nem converte IBGE. Não há retirada programada desses parâmetros.

## Evidência e limites

Regressões adicionais: cliente HTTP com descrição numérica/paginação e opção
literal com zero inicial; Chromium com atividade fora dos exemplos, anterior/
próxima, pesquisa reiniciando página, reabertura, seleção entre páginas, duas
áreas, dois tamanhos e rejeição do 101º código sem truncamento; testes de ambas
as páginas com certificação pendente ou falhando. As suítes existentes cobrem
draft/applied, elegibilidade, paridade/contexto, URLs antigas, erros empresariais
e preservação de Demais consultas. Resultados de execução são registrados abaixo.

Validação local concluída:

- `node node_modules/vitest/vitest.mjs run --maxWorkers=1`: 316 testes,
  30 arquivos aprovados. A rodada começou antes dos seis novos casos de
  certificação nas páginas; esses casos foram validados na rodada final abaixo.
- Rodada final dos testes de Empresas, Sócios, elegibilidade e cliente HTTP:
  106 testes em quatro arquivos aprovados, incluindo todos os novos casos.
- `npm.cmd run test:browser -- e2e/cnae-general.pw.ts`: seis cenários aprovados.
  `final-filters.pw.ts` e `other-queries.pw.ts`: 12 cenários aprovados na rodada
  anterior, sem alterações nesses cenários ou na implementação.
- `npm.cmd run build`, `npm.cmd run typecheck`, UTF-8 estrito dos arquivos
  alterados e `git diff --check`: aprovados. Build conserva aviso de chunk
  JavaScript maior que 500 kB; sem erro de compilação.

A primeira rodada Chromium teve seis falhas nas novas asserções: esperar uma
requisição ao voltar a página já em cache e contar chips externos com popup
modal aberto. Foram corrigidas para observar a página exibida e fechar o popup
antes de contar seleções. A rodada final dos seis cenários passou sem retries;
nenhuma mudança funcional foi feita para resolver essas falhas de teste.

Fixtures e rede interceptada comprovam comportamento do cliente. Não comprovam
cobertura/atualização da carga Receita, certificação real, estabilidade entre
páginas, desempenho PostgreSQL ou aceite operacional. Nenhum HTTP operacional,
banco compartilhado, migração, carga, pipeline, benchmark ou manutenção foi
executado. API/ETL não foram alterados. A revisão inicial terminou sem commit/push;
o fechamento Git foi autorizado posteriormente em 11/10/2026.
