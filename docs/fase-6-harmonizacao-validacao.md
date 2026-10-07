# Fase 6 — Harmonização e validação integral

## Fechamento independente de frontend — 06/10/2026

Bases confirmadas: B-Atlas `560221e`, API `5952cef`; ambos os worktrees limpos
no início. Os dez documentos solicitados foram lidos. O contrato contém somente
Fases 1–6. Não foi encontrada ausência de implementação funcional obrigatória
no escopo frontend desta revisão. Nenhum código de produto/API/produtor mudou.

| Critério finito | Implementação | Validação isolada | Aceitação operacional |
| --- | --- | --- | --- |
| Seis telas, 1440/375 px, teclado e seleção municipal | Entregue | 12 cenários Chromium revalidados após mudança das fixtures | Não certificam API/IBGE/tiles reais |
| CNAE aberto em 375 px, seleção, 409/reinício consciente | Entregue | Novo cenário Chromium e captura inspecionada; duplicatas/zero inicial conservados, sem reinício automático | Publicação operacional não revalidada |
| Retorno de detalhe Empresas/Sócios com URL/filtros/página | Entregue | Dois cenários Chromium com recarga e ID/release da participação; Obras já coberto | Detalhes operacionais não revalidados |
| Vazio, publicação indisponível, truncamento e lista preservada | Entregue | Três cenários Chromium Empresas; 503/lista Sócios e relações no popup já cobertos | Cobertura real desconhecida |
| Universo, identidade, limites e contexto mapa/lista | Entregue conforme contratos | Regressões anteriores frontend/API, inclusive 501 registros; sem mudança que exija repetir Vitest/API | Pendente relatório completo dos seis GETs com metadados/identidades/cobertura |
| PostgreSQL, latência e recursos | Sem otimização autorizada nesta revisão | Volume isolado não mede desempenho | Pendente timeout efetivo, respostas completas, logs de etapas/recursos e critério aprovado de latência |

Lista de verificações ainda necessárias, sem matriz combinatória:

1. Confirmar limites efetivos de SQL e requisição no servidor antes do ensaio.
   Ausência dessa capacidade é preparação operacional pendente da API.
2. Fornecer relatórios dos seis endpoints municipais e término no servidor;
   avaliar filtros/release/contexto, cobertura, identidades e coordenadas do
   estabelecimento/ocorrência. Primeira falha deixa restantes não medidos.
   Zero pontos não comprova percurso operacional com localização válida.
3. Fornecer evidência operacional datada do catálogo CNAE e renderização real,
   incluindo disponibilidade das referências externas utilizadas. Fixtures
   não certificam serviços operacionais ou contraste/acessibilidade integral.
4. Avaliar latências/etapas e recursos nos logs, aprovar explicitamente o critério
   de latência de produto e encaminhar falhas/incompatibilidades à API. Ensaio
   restrito não aprova todos os volumes nem consultas municipais amplas.

Plano e handoff: [fase-6-plano-operacional.md](fase-6-plano-operacional.md).
Executor reutiliza transporte existente; seis GETs no máximo, sem retries ou
paginação acumulada, validado somente offline. Confirmação dos limites do servidor
é obrigatória antes de HTTP. Sem HTTP operacional, SQL, benchmarks, migrations,
cargas, manutenção ou índices nesta revisão; sem commit/push. Evidências
operacionais continuam sendo as de 01/10 e 05/10 consolidadas na API, não
renovadas em 06/10. Perfis pararam em COUNT; timeout cliente não prova cancelamento.

Validação atual: **6 novos testes Chromium em 28,8 s** e **12 regressões Chromium
em 52,1 s**, rodadas separadas, um worker, zero retries; build TypeScript/Vite
aprovado. Captura CNAE 375 px inspecionada.
`UTF-8` estrito, mojibake, espaços finais e `git diff --check` conferidos;
plano, bloqueio antes de HTTP e relatórios mapa/lista validados offline.
Evidências/limites em [testes-navegador.md](testes-navegador.md). Fechamento independente de frontend
no escopo solicitado concluído com fixtures; **aceite integral não concedido**.
Os registros abaixo são históricos e não substituem esta matriz atual.

## Revisão de conclusão — 06/10/2026

O contrato vigente define **somente Fases 1 a 6**. Não há Fase 7 aprovada.
A implementação funcional da Fase 6 está entregue; a fase inteira, que inclui
validação integral e desempenho, **ainda não está concluída**.

| Item do escopo | Estado verificado |
| --- | --- |
| Responsividade, estados e linguagem | Implementados; suíte frontend e seis fluxos em navegador com fixtures |
| Acessibilidade do seletor, filtros, popup e alternativa textual | Controles semânticos, foco visível, regiões tabulares e teclado implementados; marcadores e seleção municipal verificados em Chromium |
| Acentuação/mojibake | Conferência UTF-8/mojibake dos arquivos desta entrega; build TypeScript/Vite |
| Navegação, retorno, URL e telas estreitas | Implementados e cobertos por regressões; navegador cobre os três modos, retorno/histórico/recarga CNO e estado/paginação Sócios |
| Volume dos contratos cartográficos | Testes isolados de 501 registros e limites presentes na API; evidência anterior documentada, não benchmark |
| Desempenho e integração operacional | Pendentes de aceite: relatórios anteriores da API registram COUNT interrompido em Empresas/Sócios, sem comprovar o fluxo cartográfico completo com latência aceitável |

Validação desta revisão: **239 testes frontend em 25 arquivos**, **12 testes
Chromium em 33,7 segundos**, build TypeScript/Vite e conferência UTF-8/mojibake
passaram. Nenhum teste ou medição contra a API/banco operacional foi executado.

API inspecionada sem alterações: a asserção OpenAPI CNO já compara os oito paths
vigentes. O código continua preservando identidade, cobertura, paginação,
publicação e limites; testes de volume não eliminam os timeouts operacionais.
As evidências de desempenho são históricas de 05/10/2026 e não foram renovadas
com consultas ao banco nesta revisão.

Antes do aceite integral, completar a verificação operacional delimitada dos
mapas com resultados/latência e as lacunas relevantes de interface ampliada
(painel CNAE aberto/409 e navegação de detalhe Empresas/Sócios). Isso é fechamento
da Fase 6, sem ampliação de semântica. Próxima thread:
[prompt-fase-6-fechamento.md](prompt-fase-6-fechamento.md).

## Validação curta em navegador — 06/10/2026

**12 testes Playwright aprovados em Chromium real**, com um worker, sem retries
e em aproximadamente 1 minuto e 12 segundos. Empresas/Sócios/Obras em Busca/Mapa
a 1440/375 px, teclado dos popups e seleção municipal, retorno/histórico/recarga
de Obras, paginação/estado separado e falha cartográfica de Sócios.
API, IBGE e tiles usam fixtures pequenas; nenhuma chamada operacional ou escrita
em banco. Configuração, capturas, limites e comandos: [testes-navegador.md](testes-navegador.md).
Há evidência de navegador real neste escopo. Integração operacional, desempenho
e os fluxos não cobertos seguem pendentes; **não há aceite integral**.
Os registros abaixo descrevem o estado anterior a esta validação.

## Retomada CNAE/CONCLA — 06/10/2026

Integração oficial implementada somente no B-Atlas sobre `a969cf0`, consumindo
API `5952cef`/OpenAPI `1.0.0`. Checkout inicial limpo nos dois repositórios.
Cliente/tipos dos cinco GETs, consulta assistida de subclasses em Empresas/Sócios
Mapa, hierarquia por FKs, proveniência, correspondências informativas e paginação
sob demanda. Após 409, cache/detalhes/páginas são descartados e o usuário pode
reiniciar conscientemente; códigos selecionados permanecem no formulário.
Sem cascata, retries/polling, publicação CNAE enviada ao CNPJ ou liberação de
secundárias. Entrega e arquivos: `cnae-ibge-frontend.md`.

Validação final: **239 testes em 25 arquivos passaram** com
`node node_modules/vitest/vitest.mjs run --maxWorkers=1`; inclui 18 casos de
cliente CNAE, 15 do painel e integração nas duas páginas. Antes disso, 57 testes
focados passaram; a revisão acrescentou casos NULL/vazio e 409 entre páginas.
`npm run build` aprovado (TypeScript/Vite). UTF-8/mojibake e espaços finais
conferidos nos 17 arquivos alterados; `git diff --check` aprovado.
Browser CLI indisponível; validação DOM não certifica visual real.
Sem HTTP/banco operacional, ETL ou migrations/cargas. Revisão, commit e
sincronização autorizados pelo usuário após a entrega; resultado Git informado
no fechamento. Navegador real e desempenho operacional permanecem pendentes;
**não há aceite integral**.
O relatório histórico abaixo mantém as evidências e limites de sua própria data.

Nota posterior (2026-10-05): `cnpj-filtros-b2b.md` documenta a evolução B2B e a
nova alternativa contextual Empresas, que declara release/filtros/contexto.
A limitação histórica da lista Empresas sem envelope é mitigada nesse fluxo;
não elimina a ausência de snapshot CNPJ nem valida desempenho ou navegador real.
O restante deste relatório conserva as evidências da entrega de 2026-10-01.

Data: 2026-10-01. Escopo: B-Atlas e AzData API, exclusivamente Fase 6.
Base B-Atlas: `bfbe2ca` (Fase 5 efetiva); base API: `dbf1c1f`.
Ambos os worktrees estavam limpos antes das alterações.
O contrato integral e os handoffs de Sócios/CNO foram lidos antes de editar.

## Entrega

- Seletor Busca | Mapa restaura os parâmetros próprios de cada modo durante
  alternância, inclusive após aplicar filtros. A URL ativa continua sendo a
  fonte do recorte e do retorno. O histórico de modos usa estado do Router;
  compartilhar uma URL compartilha o modo ativo, não o histórico do outro modo.
- Foco visível nos controles e nos caminhos SVG. Marcadores recebem nome
  acessível, Tab, Enter/Espaço para abrir e Escape para fechar o popup. A abertura
  por teclado move foco para um link; Escape no popup devolve foco ao marcador.
- Tabelas têm região identificada e foco para rolagem por teclado. A alternativa
  textual permanece paginada no servidor e inclui registros sem coordenadas.
- Mapas não capturam rolagem da página para zoom. Painéis podem encolher,
  cabeçalhos quebram linha e paginação/popup se ajustam a telas estreitas.
- Empresas recebe o mesmo painel de filtros de Sócios, erro de UFs e estados
  explícitos de publicação indisponível e ausência de coordenadas. Limite máximo
  passa a aparecer também em Empresas e Obras. Cobertura completa refere-se
  somente aos pontos válidos, preservando o total sem coordenadas.
- Obras verifica filtros publicados e release das ocorrências da página antes
  de mostrar pontos; divergência mostra aviso e atualização manual. Pontos de
  outra release/arquivo ficam ocultos. Empresas verifica filtros e release de
  cada ponto contra o mapa; Sócios mantém sua comparação de release/filtros.
- POST de geolocalização de Obras passa a depender do botão explícito
  “Solicitar localizações da página (até 50)”. Uma tentativa por ID na sessão
  do QueryClient, sem repetição automática. Nenhum GET solicita enriquecimento.
- CNO rejeita coordenadas não finitas, fora dos limites e 0,0 na leitura
  persistida, normalização do produtor e mapa. As ocorrências continuam na lista.
- O teste OpenAPI verifica o conjunto exato dos oito paths vigentes, incluindo
  `/obras/mapa/`, mantendo a comparação dos campos requeridos de lista/detalhe.

Identidades, documentos, códigos, null/vazios, duplicatas, precisão postal e
relações publicadas permanecem conforme os contratos predecessores. Não houve
novas fontes, inferências, rotas, alteração de produtor ou de modelos managed=False.

## Evidências e avaliação de volume

- API: 100 testes CNPJ/CNO em SQLite de teste isolado passaram. Os modelos
  não gerenciados são criados pelas fixtures somente no banco de teste.
- B-Atlas: 198 testes em 22 arquivos passaram com `--maxWorkers=1`, incluindo navegação,
  cancelamento, identidade, co-localização, cobertura, erros e paginação.
- Builds B-Atlas e API web; verificação de UTF-8/mojibake e `git diff --check`
  em ambos os repositórios.
- Novos casos de volume exercitam 501 ocorrências CNO, 501 estabelecimentos e
  501 relações participação/estabelecimento, atravessando o lote de 500. Cada
  mapa retorna três pontos, declara 501 pontos totais e truncamento, com orçamento
  de até dez consultas e sem INSERT/UPDATE/DELETE durante o GET.
- São evidências isoladas de volume, limite e ausência de cascata; não medem
  latência, plano, memória ou desempenho em PostgreSQL produtivo. A varredura
  para contagens continua percorrendo o universo do recorte mesmo com limit=3.
- Leaflet continua em chunk próprio e mapas são carregados sob demanda.

Achados anteriores corrigidos: POST automático de Obras, falta de foco nos
marcadores, perda de filtros na alternância, validação numérica incompleta no
CNO, asserção OpenAPI desatualizada e diferenças de linguagem/estados.
A revisão React verificou hooks, lazy loading, cancelamento, ausência de
cascata, semântica dos links e controles e limites da apresentação.

## Medição manual preparada, não executada

O executor recomendado para VSCode é `scripts/measure_map_contracts.py`;
`scripts/measure-map-contracts.ps1` permanece como alternativa de terminal.
O Python usa apenas a biblioteca padrão e faz uma chamada por área, sem detalhes,
POST, retry, laços de paginação ou recorte nacional. Exige UF e códigos municipais
distintos Receita/TOM; limite padrão 10, máximo 100 e timeout HTTP de 20 segundos.
Registra tempo HTTP, tamanho do corpo recebido, release, filtros e cobertura.
O prazo total é imposto por processo separado, com teto de leitura de 5 MiB.
`CONFIG` já contém Belo Horizonte/MG, Receita `4123`, TOM `4123` e a origem
validada da configuração local do B-Atlas. Execute **Run Python File** sem argumentos.
A origem pode vir de `VITE_AZDATA_API_BASE_URL` do ambiente ou `.env.local/.env`.
Progresso e resultados ficam em `var/map-contract-measurements/<timestamp>/`
como `events.jsonl` e `summary.json`, em UTF-8; esse diretório é ignorado pelo Git.
Esse plano municipal amplo é histórico. A política vigente de CNPJ exige
localidade + CNAE e/ou período; não executar o exemplo abaixo sem revisão.
O planejamento operacional posterior está em [fase-6-plano-operacional.md](fase-6-plano-operacional.md).

Exemplo para execução pelo usuário, substituindo origem e códigos oficiais:

```powershell
python scripts/measure_map_contracts.py --base-url 'https://ORIGEM-DA-API' --uf MG --municipio-receita 'CODIGO_RECEITA' --municipio-tom 'CODIGO_TOM' --limit 10
```

O timeout do cliente não garante cancelamento da consulta no servidor. Limitar
pontos não limita o custo da contagem. Usar município conhecido e acompanhar
logs do servidor; não interpretar essa medição como EXPLAIN ou tempo SQL isolado.
Não foram executados comandos contra banco compartilhado, índices, cargas,
migrations operacionais ou scripts de produção.

## Limitações e aceite

Não existe ferramenta de navegador exposta nesta sessão e `agent-browser` não
foi encontrado no PATH. Não houve verificação visual real de larguras, teclado,
popup, tiles ou contraste; testes DOM/mocks não substituem essa validação.
Pendente conferir as seis combinações a 1440 e 375 px, Tab/Enter/Espaço/Escape,
seleção territorial, tabela rolável, retorno de detalhes, recarga e histórico.

Empresas usa a lista existente sem metadados de release/filtros na resposta:
os filtros enviados são iguais, mas não se confirma publicação entre chamadas.
Obras declara release por ocorrência, não em envelope da lista; página vazia
não comprova release. Sócios compara release/filtros, mas CNPJ não tem
versionamento por linha: isso não garante snapshot transacional, sobretudo
durante alteração de tabelas na mesma release. Essas limitações são explícitas
na interface; ampliá-las exige contrato próprio, não inferência do consumidor.

**Aceite da Fase 6: implementação e validação automatizada entregues;
aceite integral pendente de navegador real e medição PostgreSQL.**
**Contrato integral: preservado, sem declaração de aceite integral**, devido
às pendências de validação e às limitações de compatibilidade acima.
Fases 1 a 5 não foram reabertas. O fechamento Git foi autorizado posteriormente
pelo usuário nesta thread; relatórios de medição permanecem locais e ignorados.
