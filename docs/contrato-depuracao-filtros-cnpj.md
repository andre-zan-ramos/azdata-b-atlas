# Contrato de revisão dos filtros CNPJ

Data: 07/10/2026. Status: Etapas 1 a 4 implementadas; Etapa 5 pendente.
Entrega atual: preparação e consultas completas em Empresas e Sócios no modo Mapa.

## 1. Objetivo e escopo

Empresas e Sócios, no modo Mapa, devem consultar apenas após seleção explícita
de localidade e de CNAE e/ou período. A interface deve permitir qualquer CNAE
do domínio publicado, seleção múltipla e edição em diálogos compactos, dentro
de **Demais consultas**, sem controles duplicados ou rotulados como legado.

Interpretações propostas para revisão:

- Localidade mínima significa UF válida; município é opcional. Brasil inteiro
  não satisfaz o requisito. Se o produto exigir município, alterar esta regra
  antes da etapa 1 e replicá-la nos critérios de aceite.
- “Demais consultas” significa uma seção recolhível nas áreas existentes,
  não uma nova área no cabeçalho. Não há atualmente esse rótulo em `src`.
- A revisão vale para Empresas e Sócios no modo Mapa. Busca textual, detalhes
  e Obras conservam seus contratos; levar filtros B2B à Busca exigiria primeiro
  um contrato API próprio, pois os endpoints atuais não oferecem essa paridade.

Esta proposta substitui, nesse escopo, a decisão anterior de filtros mínimos
opcionais e de aplicação territorial imediata. Complementa os contratos
`contrato-modos-busca-mapa.md`, `cnpj-filtros-b2b.md` e `cnae-ibge-frontend.md`.
Não é uma Fase 7 nem declara concluído o aceite operacional da Fase 6.

## 2. Diagnóstico confirmado em arquivos antes da Etapa 1

| Evidência | Consequência |
| --- | --- |
| `establishments-page.tsx` e `partner-map-mode.tsx`: mapa/lista usam `enabled: !repeatedFilters` | Abrir `?modo=mapa` habilita consulta sem localidade ou atividade/período. |
| `applyTerritory` escreve diretamente na URL | Escolher UF, município ou voltar ao Brasil dispara nova consulta, independentemente do formulário. |
| Municípios e referências IBGE vêm de `map.data.territories` | Bloquear o mapa sem separar esse carregamento impede preparar a primeira consulta municipal. |
| `styles.css:93` aplica largura total e altura mínima a todos os inputs | Checkboxes herdam dimensões de campos textuais; isso explica os controles grandes nas capturas. |
| `CnpjB2BFilters` dá destaque a quatro segmentos, com catálogo oficial expandido dentro da coluna | A seleção parece restrita e aumenta muito a altura do painel. |
| API `backend/apps/receita_federal/cnpj/b2b.py` aceita `cnaes` fora de `SEGMENTS` | Os quatro segmentos não limitam o universo CNAE da API. Códigos devem existir em `CnaeRf`. |
| API/cliente já têm `dominios/cnaes/` e `dominios/municipios/?uf=...` | Há caminhos para seleção geral e territorial sem depender do mapa empresarial. |
| Empresas mostra `cnae` “legado”; Sócios também oferece `cnae` separado | Há duas entradas concorrentes de atividade; API rejeita combinar `cnae` com novos filtros. |

Os logs fornecidos mostram sucesso HTTP da lista sem filtros; a captura mostra
timeout na interface. Esses dados não identificam o estágio SQL responsável
nem comprovam desempenho aceitável. Nenhuma busca operacional foi executada
para esta análise.

## 3. Regra de consulta e estado

A elegibilidade exige simultaneamente:

1. UF válida, e município pertencente à UF quando informado;
2. pelo menos um CNAE selecionado **ou** pelo menos um limite temporal válido;
3. todos os parâmetros presentes válidos, sem repetição ambígua, datas
   invertidas, códigos malformados ou conflito de atividade.

Situação cadastral, porte, matriz/filial, natureza jurídica, nome do sócio,
CNPJ básico, `atividade_escopo` isolado e versão de catálogo não substituem o
CNAE/período. Não inserir CNAE, situação Ativa, datas ou município implícitos.
Aceitar intervalos abertos, como “desde 01/01/2025”, conforme a API existente.

Separar **rascunho** e **recorte aplicado**. Alterar campo, clicar em UF ou
município, confirmar diálogo e recolher seção apenas modifica o rascunho.
**Aplicar filtros** valida, atualiza a URL, reseta `page=1` e consulta mapa/lista
com o mesmo recorte. Paginação utiliza exclusivamente o recorte aplicado.
Mostrar quando houver alterações ainda não aplicadas.

URL completa e válida pode executar ao abrir/recarregar ou voltar pelo
histórico. URL incompleta/ inválida conserva escolhas para correção e não
consulta endpoints de mapa/resultados. Entrada vazia mostra orientação de
seleção, sem spinner, erro ou mensagem de zero resultados. Queries desabilitadas
não podem ser interpretadas como carregamento apenas por `isPending`.

Limpar filtros/voltar ao Brasil deve remover o recorte aplicado e os resultados
visíveis, cancelar requisições pendentes e retornar ao estado de preparação.
Respostas atrasadas não podem reaparecer. Retry, atualização conjunta,
paginação e refetch por foco/reconexão devem respeitar a elegibilidade;
configurar consultas pesadas sem refetch automático ou retry automático.

Metadados, domínios e geometria territorial são auxiliares: podem ser lidos
para preparar escolhas. Nunca usar mapa, resultados ou facetas empresariais
como carregador de opções. Municípios devem vir do domínio Receita por UF,
com paginação explícita e referência `codigo_ibge` quando disponível. Ausência
ou ambiguidade de correspondência não autoriza inferência por nome/prefixo.

## 4. Organização visual

O painel conserva a localidade e o botão **Aplicar filtros**. A seção recolhível
**Demais consultas** agrupa atividade, período e demais filtros empresariais.
Mesmo recolhida, exibe resumo das escolhas aplicadas e indicador de rascunho.
Recolher não limpa valores e não remove dados da submissão.

| Controle | Edição | Resumo fora do diálogo |
| --- | --- | --- |
| Selecionar CNAEs | Diálogo com busca e seleção múltipla | Códigos/descrições escolhidos, quantidade e escopo de atividade |
| Definir período | Diálogo com dois intervalos independentes | Campo temporal e limites, inclusive intervalos abertos |
| Demais filtros | Campos compactos na seção | Valores escolhidos; sem defaults empresariais |

Diálogos têm **Confirmar**, **Cancelar** e **Limpar**. Confirmar altera só o
rascunho externo; cancelar/Escape restaura o estado anterior à abertura.
Implementar título acessível, foco inicial, contenção de foco, retorno ao
acionador, teclado e layout em 375/1440 px. Enter dentro do diálogo não aplica
a consulta empresarial. Checkboxes usam estilo próprio, sem dimensões de
input textual. Resumos e seleções devem continuar acessíveis em telas pequenas.

## 5. CNAE geral e eliminação da duplicidade

O seletor principal lê o domínio Receita `dominios/cnaes/`, busca por descrição
e percorre páginas explicitamente. Exibe código literal e descrição publicados.
Seleção persiste ao buscar, paginar e reabrir; permite remover itens e limpar.
Não pesquisar somente entre os itens da página carregada, nem baixar todo o
domínio na abertura. Código exato pode ser informado como seleção explícita;
se a API de domínio não oferecer filtro por código, não inventar parâmetro:
validar o código na consulta CNPJ ou contratar a extensão antes de consumi-la.

“Todo tipo de CNAE” significa acesso a todos os códigos disponíveis, não
selecionar todos em uma requisição. O limite atual é 100 itens em `cnaes`.
Mostrar esse limite; não truncar silenciosamente. Se houver demanda de seleção
em massa, definir outra etapa API para limites e custo.

Catálogo IBGE/CONCLA permanece uma consulta auxiliar identificada, sem confundir
versão/cobertura oficial com o domínio Receita. Selecionar subclasses literais;
seção, divisão, grupo e classe não expandem automaticamente em códigos. Código
oficial ausente na Receita mantém seleção e recebe erro explícito; não converter
por correspondência nem substituir descrições da fonte Receita.

Retirar os quatro segmentos como caminho principal. URLs existentes com
`segmentos` continuam reconhecidas, com versão e códigos explícitos para revisão;
nunca transformar segmento desconhecido ou de versão divergente silenciosamente.
Após revisão confirmada, a nova seleção usa `cnaes` e `atividade_escopo`, sem
`segmentos/catalog_version`. A resolução desses segmentos deve ser sob demanda.
O endpoint atual também publica `secondary_available`: separar essa capacidade
da apresentação dos segmentos no cliente, ou contratar endpoint próprio antes
de retirar sua utilização. Não deduzir disponibilidade pelo catálogo IBGE.

Remover o campo duplicado `cnae` das duas interfaces. URL antiga com `cnae`
válido e isolado pode ser normalizada explicitamente para `cnaes` com escopo
`principal`, preservando literal e `return_to`. URL com combinações conflitantes
pede revisão e não executa. A proposta não remove parâmetros da API para outros
consumidores; não criar tela alternativa ou controles de legado.

OR entre CNAEs; AND com território, período e demais filtros. Secundárias só
ficam disponíveis pela certificação da release declarada pela API. Nunca
habilitar por conta própria, classificar por nome ou multiplicar relações.

## 6. Períodos

O diálogo apresenta dois grupos que podem coexistir:

- **Início de atividade**: `inicio_atividade_de` / `inicio_atividade_ate`;
- **Evento da situação cadastral**: `situacao_evento_de` / `situacao_evento_ate`.

Cada grupo admite de, até ou ambos; limites são inclusivos, datas ISO na API
e apresentação local na UI. Ambos os grupos ativos se combinam por AND.
Resumo exemplo: “Início de atividade: 01/01/2025 a 31/12/2025; evento cadastral:
desde 01/06/2025”. Sem limites, o grupo não envia parâmetros nem satisfaz a regra.

Explicar dentro do diálogo que evento cadastral não significa última atualização
geral nem necessariamente abertura. Datas ausentes não correspondem ao intervalo.
Não oferecer “empresas ativas naquele período” como se esses campos provassem
histórico operacional. Erros mantêm os limites escolhidos para correção.

## 7. Etapas e critérios de encerramento

As etapas abaixo pertencem a esta revisão. Implementar somente a etapa
solicitada; seus dependentes começam após os critérios anteriores estarem atendidos.

| Etapa | Trabalho | Aceite |
| --- | --- | --- |
| 1 — Preparação e consultas completas | Predicado compartilhado, rascunho/aplicado, seleção municipal independente, controle de queries e estados iniciais nas duas áreas | Nenhum mapa/lista ao abrir vazio, escolher só território, remover localidade ou receber URL incompleta; recorte completo aplicado consulta; URL válida restaura; municípios podem ser escolhidos sem mapa. |
| 2 — CNAE geral | Seletor em diálogo, busca/paginação Receita, múltipla seleção, limite, escopo, integração auxiliar IBGE e revisão de URLs antigas | CNAE fora dos quatro segmentos é selecionável; seleção atravessa páginas; cancelar não altera; confirmar não consulta; sem campo duplicado; erro de domínio conserva escolhas. |
| 3 — Período | Diálogo temporal, validação e resumos, dois intervalos | Localidade + período sem CNAE é elegível; limites abertos funcionam; inválidos bloqueiam; confirmar/cancelar e combinação AND corretos. |
| 4 — Demais consultas e harmonização | Agrupamento recolhível, resumos, demais campos, CSS e acessibilidade | Empresas/Sócios seguem o mesmo padrão; fechar seção não perde seleção; teclado e 375/1440 px aprovados; sem controles de legado. |
| 5 — Validação final limitada | Atualizar testes relevantes, contratos e plano manual operacional | Cenários completos aprovados, URL/histórico/retorno preservados, compatibilidade mapa/lista e identidades mantidas; evidência operacional separada da evidência com fixtures. |

A etapa 1 já deve respeitar o estado de rascunho dos controles atuais; etapas
2/3 substituem sua apresentação, sem reintroduzir disparos automáticos.
Se qualquer mudança exigir parâmetro/endpoint API novo, documentar e entregar
API/OpenAPI primeiro, depois seu consumidor. A regra mínima aqui é do produto
B-Atlas; impor rejeição global na API requer revisão dos demais consumidores.

## 8. Validação e limites da análise

Validar ausência de chamadas incompletas com mocks/interceptação: a prova deve
ser contagem zero de requisições, não executar buscas incompletas no servidor.
Cobrir UF + CNAE, UF + período, UF + CNAE + período, e UF/município + CNAE,
nas duas áreas; cenários de erro usam fixtures. Preservar validações de release,
filtros, contexto B2B, registros sem coordenadas e identidade das relações.

Validação operacional posterior usa somente recortes completos, explícitos e
limitados, por exemplo MG/4123 + `cnaes=5611201&atividade_escopo=principal`.
Não ampliar chamadas, retries ou benchmarks para preencher uma matriz.
Os executores antigos devem ser revisados contra esta política antes de uso.
Definir orçamento de chamadas, limites do servidor e critério de latência antes
da execução. Filtro mínimo não garante consulta rápida nem cancelamento SQL.

Na análise inicial foram lidos arquivos B-Atlas e API e as evidências enviadas pelo
usuário. Não foram executados HTTP, banco, serviços, testes operacionais ou Git.
O estado original era de revisão, sem implementação. A entrega da Etapa 1
é registrada abaixo; desempenho operacional permanece pendente.


## 9. Entrega da Etapa 1 - 07/10/2026

Implementada exclusivamente a Etapa 1. Os controles atuais foram reutilizados;
diálogos CNAE/temporal e Demais consultas permanecem nas etapas posteriores.

- `src/utils/cnpj-map-preparation.ts` centraliza elegibilidade, rascunho
  territorial e carregamento municipal independente. O domínio Receita é
  percorrido por `uf`, `page` e `page_size=50`, sem mapa/resultados/facetas.
  Códigos literais e `codigo_ibge` publicados são preservados. Cliques municipais
  exigem correspondência IBGE única; sem referência, o seletor Receita funciona.
- Campos existentes mantêm rascunho no formulário. Campos e cliques territoriais
  não escrevem a URL. Aplicar valida o conjunto e reinicia a página; erros
  conservam o rascunho. A paginação consulta o recorte da URL e conserva edições
  pendentes. URLs completas restauram o recorte e o histórico; `return_to`
  continua usando a URL aplicada.
- Queries empresariais usam o predicado compartilhado, sem retry ou refetch
  automático por foco/reconexão. Ações manuais de refetch também são
  protegidas. Estado desabilitado mostra orientação, sem loading empresarial
  ou vazio fictício. Limpar/Voltar ao Brasil cancela mapa/lista, remove o
  recorte e oculta dados em cache; respostas atrasadas não reaparecem.
- Compatibilidade de release, filtros, contexto B2B, identidades e lista sem
  coordenadas permanece. Conflito entre `cnae` e atividade B2B pede correção,
  sem remover silenciosamente o CNAE. A API continua validando existência de
  CNAEs e certificação de secundárias; não se deduz capacidade pelo IBGE.

Validação isolada: testes das duas áreas e do utilitário cobrem entradas
incompletas/inválidas com contagem zero de chamadas empresariais, quatro tipos
de recorte completo, domínio municipal paginado, histórico, retorno, paginação,
compatibilidade, aborto dos sinais e conclusões tardias após limpeza.

Limites: mocks provam o comportamento do cliente, sem comprovar latência,
compatibilidade operacional API/PostgreSQL ou cancelamento SQL. Nenhuma busca
operacional, banco, benchmark ou carga foi executada. A execução inicial da
implementação terminou sem commit ou sync; o fechamento Git foi autorizado
posteriormente.

Checks locais: suíte completa com um worker, 277 testes em 26 arquivos aprovados;
rodada final focada, 65 testes em quatro arquivos aprovados; build de produção
(`tsc --noEmit` + Vite) e `git diff --check` aprovados. A rodada paralela inicial
teve timeouts; a execução serial foi usada para separar esse ruído das falhas.

Revisão de fechamento: corrigida a expectativa de ausência de loading nos
testes das duas páginas para usar o texto real da interface. A suíte completa,
os 57 testes das páginas, o build e a checagem staged foram aprovados.

## 10. Entrega da Etapa 2 e próxima etapa

O seletor CNAE geral está registrado em [entrega-etapa-2-cnae-geral.md](entrega-etapa-2-cnae-geral.md).
O prompt da próxima etapa é [Etapa 5 — Validação final limitada](prompt-etapa-5-filtros-cnpj.md).
Os prompts de implementação já concluída foram retirados; os contratos e
registros de entrega permanecem como referência.

## 11. Entrega da Etapa 3 — Período, 07/10/2026

Empresas e Sócios no modo Mapa compartilham `CnpjPeriodDialog`. Dois intervalos
independentes aceitam limites abertos/inclusivos e se combinam por AND.
Validação de datas reais, formato e inversão é compartilhada com a elegibilidade.
Edição ISO explícita conserva entradas inválidas para correção; resumo brasileiro.
Confirmar altera somente o rascunho; Cancelar/Escape descarta; Limpar edita apenas
a sessão do diálogo. Aplicar continua sendo a única submissão empresarial.
Histórico, recarga, paginação com edições pendentes e limpeza foram preservados,
assim como CNAEs, municípios e bloqueios das Etapas 1/2. Nenhuma API nova.

Validação de fechamento: suíte serial completa com 301 testes em 29 arquivos,
28 cenários Chromium em 375/1440 px, build e checagem staged aprovados.
Mocks/fixtures bloquearam tráfego operacional. Evidência limitada ao cliente:
sem comprovação de desempenho API/PostgreSQL ou cancelamento SQL.
Etapa 4 não implementada; Etapa 5 e aceite operacional Fase 6 pendentes.

O prompt concluído da Etapa 3 e seu relatório separado foram retirados no
fechamento; este contrato conserva a entrega e o prompt seguinte orienta a Etapa 4.

## 12. Entrega da Etapa 4 — Demais consultas, 07/10/2026

Empresas e Sócios compartilham `CnpjOtherQueries`: seção recolhível com CNAEs,
períodos e demais campos empresariais, conservando localidade e Aplicar filtros
no painel. O resumo aplicado (códigos, descrições já disponíveis, escopo,
períodos e demais valores) e o indicador de rascunho permanecem visíveis quando
recolhida. Campos continuam montados e participam integralmente da submissão;
reabrir conserva valores. CSS compacto limitado ao painel e checkboxes próprios.
Nenhum endpoint/parâmetro novo; elegibilidade, diálogos e contratos anteriores
preservados. Paginação continua usando o aplicado e conserva o rascunho.

Validação com mocks/fixtures cobre recolhimento por teclado, zero chamadas
empresariais durante preparação/edição, envio recolhido, resumo aplicado versus
pendente e paginação nas duas áreas em 375/1440 px, além das regressões existentes
de histórico, recarga, URLs inválidas/repetidas, secundárias, erros e respostas
atrasadas após limpeza. Tráfego operacional bloqueado no navegador.
Fixtures não comprovam desempenho API/PostgreSQL ou cancelamento SQL.
Etapa 5 e aceite operacional Fase 6 permanecem pendentes. A implementa??o
inicial terminou sem commit/sync; o fechamento Git foi autorizado depois.

Checks finais: 302 testes unitários em 30 arquivos (um worker), suíte completa
Chromium com 32 cenários e build de produção aprovados. A primeira rodada
unitária teve timeouts por execução paralela; a rodada serial final passou.
O navegador identificou duplicação do aviso pendente; corrigida antes da rodada
completa aprovada. Checagem local de UTF-8/whitespace dos arquivos alterados aprovada.

Revisão de fechamento: normalizados fins de linha para manter o diff limitado
ao escopo e preparado o prompt da Etapa 5. Checks Git de whitespace aprovados.

Fechamento: 29 testes de Sócios/componente compartilhado e 33 de Empresas
aprovados. Um cenário de Empresas excedeu 5 s na rodada focada; a execução
isolada com prazo de 15 s passou (o cenário terminou em 1,9 s), sem alterar
o timeout padrão nem o código funcional.
