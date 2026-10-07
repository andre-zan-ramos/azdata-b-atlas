# Validação curta em navegador real

## Revisão dos filtros — 07/10/2026

`e2e/period.pw.ts` acrescenta seis cenários da Etapa 3: diálogo temporal nas
duas áreas em 375/1440 px, datas inválidas/invertidas, limites abertos, edição
isolada, teclado, paginação aplicada com rascunho pendente, recarga, URLs
bloqueadas, combinação com CNAEs/município e histórico. Smoke adaptado ao diálogo.
Suíte completa: 28 cenários aprovados com fixtures, um worker e zero retries;
tráfego operacional bloqueado. Evidência operacional permanece pendente.

`e2e/cnae-general.pw.ts` acrescenta quatro cenários: seletor Receita nas duas
áreas CNPJ, em 375 e 1440 px. Cobrem busca por descrição no servidor, paginação,
seleção múltipla, reabertura, rascunho/aplicado, limpeza descartada por Escape,
Tab/Shift+Tab, retorno de foco, largura e paridade mapa/lista. Zero requisições
empresariais antes de Aplicar; sem filtros implícitos.

Na revisão para commit da Etapa 2, os cenários históricos CNPJ de `smoke.pw.ts`
e `acceptance.pw.ts` foram atualizados para exigir recorte completo e aplicação
explícita. O cenário IBGE abre agora o diálogo Receita e conserva a seleção
durante 409/reinício. Fixtures incluem os domínios Receita CNAE/municípios.
Obras conserva a interação existente. A suíte completa de 22 cenários passou
em 2,2 minutos na rodada final desta revisão, sem testes ignorados ou retries.
Somente o cenário IBGE mais longo possui prazo local de 60 s; um worker,
zero retries e orçamento de 30 chamadas interceptadas permanecem.

Os relatórios em `playwright-report/` e `test-results/` são artefatos transitórios
da última execução. Contagens e evidências de 06/10 abaixo são históricas;
não representam o conteúdo atual desses diretórios. O arquivo de evidência
local `var/map-contract-measurements/20261006_browser/` foi preservado.

Contrato atual: [revisão de filtros CNPJ](contrato-depuracao-filtros-cnpj.md).
Fixtures de navegador não certificam API/PostgreSQL operacional.

## Complemento de fechamento — 06/10/2026

`e2e/acceptance.pw.ts`: **6 testes novos aprovados em 28,8 s**, Chromium real,
um worker, zero retries. Os **12 cenários anteriores passaram em 52,1 s** em
rodada separada, porque as fixtures compartilhadas mudaram. Build aprovado.
Não houve alteração no código de produto, nem repetição de Vitest/API.

| Cenários adicionais | Quantidade | Evidência |
| --- | --- | --- |
| CNAE aberto em 375 px | 1 | Proveniência expandida, largura do documento, seleção literal com códigos manuais/duplicatas, 409 entre páginas, descarte da apresentação antiga, reinício por botão sem consultar nós automaticamente, Escape devolve foco |
| Detalhes Empresas/Sócios | 2 | `return_to`, município, data e página 2 após retorno/recarga; participação por ID/release e documento mascarado preservados |
| Estados Empresas | 3 | Vazio distinguido de publicação indisponível; nenhum ponto inventado; truncamento 1 de 2 explícito com duas linhas textuais |

O painel compartilhado foi exercitado em Empresas. Captura do painel em 375 px
inspecionada, sem transbordamento. Relatório do complemento e captura preservados
localmente em `var/map-contract-measurements/20261006_browser/` antes da regressão.
O relatório em `playwright-report/` contém a rodada mais recente de 12 cenários.

Detalhes existentes usam POST para consultas judiciais. Fixtures permitem apenas
`judicial/tjmg/processes/by-document/` e `by-party-name/` na origem de teste,
retornando lista vazia; isso não certifica integração judicial. POST de
geolocalização e demais métodos/rotas continuam bloqueados. 409 CNAE e 503 Sócios
intencionais são as únicas exceções aos erros HTTP. Teto de 30 chamadas por teste.

```powershell
npx.cmd playwright test e2e/acceptance.pw.ts
```

`npm.cmd run test:browser` descobre agora 18 cenários. API/IBGE/tiles continuam
interceptados; integração operacional e PostgreSQL ficam pendentes conforme
[fase-6-plano-operacional.md](fase-6-plano-operacional.md). As rodadas separadas
não foram apresentadas como execução conjunta. O texto abaixo é histórico.

Execução em 06/10/2026 no B-Atlas: **12 testes aprovados**, sem falhas,
sem testes ignorados e sem retries, em aproximadamente 1 minuto e 12 segundos.
Playwright 1.63.0 com Chromium Headless Shell, um worker e contextos isolados.
Nenhum comportamento de produto foi alterado nesta entrega.
`npm.cmd run build` também passou, incluindo TypeScript da configuração e testes.

## Escopo e carga

O navegador e o Leaflet são reais. API AzData, estados/malha IBGE e tiles
recebem fixtures locais pequenas. Nenhuma requisição alcança a API operacional,
o IBGE ou o OpenStreetMap; POSTs e chamadas externas desconhecidas falham o teste.
A API de teste tem limite de 30 chamadas por cenário. Não há contagens, carga,
geolocalização operacional, benchmarks ou acesso ao PostgreSQL.

O Vite de teste usa `127.0.0.1:45177`, uma origem de API reservada às fixtures e
é iniciado/encerrado pelo Playwright. Uma porta ocupada causa falha; servidores
existentes não são reutilizados nem encerrados. Somente Chromium Headless Shell
é necessário; Firefox, WebKit, vídeos e execução paralela não são habilitados.

## Evidências

| Cenários | Quantidade | Verificação |
| --- | --- | --- |
| Empresas, Sócios e Obras em 1440/375 px | 6 | Busca com resultados, alternância para Mapa, UF, marcadores, resultados textuais, largura da página e rolagem local da tabela no celular |
| Teclado dos três mapas | 3 | Foco/Tab, Enter/Espaço, popup, Escape e retorno do foco; seleção municipal via Enter envia o código Receita/TOM da ponte; popup de Sócios conserva as duas relações no mesmo local |
| Detalhe de Obras em 375 px | 1 | Identidade da ocorrência, `return_to`, retorno, voltar/avançar, recarga e conservação de UF/município; botão de geolocalização habilitado sem POST automático |
| Paginação/alternância de Sócios | 1 | Pagina apenas a lista, não refaz o mapa, conserva separadamente os estados Busca/Mapa e não busca detalhes por ponto |
| Mapa de Sócios indisponível | 1 | HTTP 503 controlado mantém lista e paginação, sem repetir automaticamente a consulta cartográfica |

Todos os cenários verificam ausência de erros JavaScript/React e de chamadas
externas inesperadas. Chamadas cartográficas dos cenários de teclado não levam
`page` ou `include_total`. O relatório inclui as chamadas interceptadas e
12 capturas (Busca/Mapa nos seis cenários de largura). Foram inspecionadas as
capturas dos três mapas em 375 px e de Empresas em 1440 px; não se observou
transbordamento da página nesses estados. A tabela de Sócios/Obras rola dentro
de sua região, preservando a largura do documento.

A primeira execução detectou uma interação ausente no teste de Sócios: o grupo
precisa ser aberto para revelar a tabela. O teste foi corrigido para executar
essa ação do usuário; não houve ajuste da aplicação para acomodar a asserção.
Os dois cenários corrigidos passaram e, depois, os 12 passaram juntos.

Na revisão para commit, as fixtures foram alinhadas aos dois estabelecimentos
declarados na cobertura; o bloqueio de métodos não GET também cobre a origem
local e chamadas de API precisam usar a origem de teste esperada. Respostas HTTP
com erro falham o teste, exceto o 503 intencional do cenário de indisponibilidade.
Após esses ajustes, **12 testes passaram em 33,7 segundos**, sem retries.

## Executar novamente

```powershell
npm.cmd ci
npx.cmd playwright install chromium --only-shell
npm.cmd run test:browser
npx.cmd playwright show-report
```

Após a instalação inicial, somente `npm.cmd run test:browser` é necessário.
`playwright-report/index.html` reúne resultados, capturas e evidências; traces
são conservados apenas quando há falha. `playwright-report/` e `test-results/`
são ignorados pelo Git. A próxima execução substitui o relatório anterior.
Os arquivos `.pw.ts` não entram na descoberta padrão do Vitest; TypeScript
verifica `e2e/` e `playwright.config.ts` junto com o projeto.

## Alcance do aceite

Há agora evidência de navegador real para estes fluxos, com respostas simuladas.
A falta de `agent-browser` não é bloqueio para esta suíte. Ela não certifica
integração com a API operacional, desempenho SQL/HTTP, disponibilidade de tiles
externos, malhas oficiais completas, contraste/acessibilidade integral ou
comportamento com grandes volumes. O painel CNAE aberto e seus fluxos 409 não
faziam parte da suíte original; estão cobertos pelo complemento acima.

O aceite integral da Fase 6 continua dependente dessas validações específicas
e da medição operacional; não há mais ausência total de testes de navegador.
