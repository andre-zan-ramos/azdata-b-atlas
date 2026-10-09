# Ficha de preparação — aceite operacional CNPJ da Fase 6

Preparada em 09/10/2026, America/Sao_Paulo (UTC−03:00).
Estado: **bloqueada para HTTP; ensaio não autorizado**. Não é Etapa 6 nem Fase 7.

Esta ficha registra pendências técnicas; o usuário não precisa preenchê-la
manualmente. Nesta entrega não há teste para executar. Conferir os controles
do APP é distinto de Aplicar filtros ou abrir uma URL completa, ações que podem
consultar a API real. A preparação não confirma desempenho dessas consultas.

## Bases e alcance

Inspeção por leitura, com ambos os worktrees inicialmente limpos:

- B-Atlas: `d498dcbfb4e8b4bd52528c777739787f9f4d46e7`.
- API: `5952cefb43baf3665cde5e2c6aa48f1c0088e34b`.

Referências: [contrato da revisão, entrega da Etapa 5](contrato-depuracao-filtros-cnpj.md#13-entrega-da-etapa-5--validação-final-limitada-07102026),
[plano histórico](fase-6-plano-operacional.md), [modos](contrato-modos-busca-mapa.md),
[B2B](cnpj-filtros-b2b.md). API, no checkout irmão `../api/docs`:
`cnpj-filtros-b2b-implementacao.md`, `openapi-cnpj-b2b-v1.json`,
`cnpj-socios-mapa-contract.md`, `CNPJ_GEOLOCATION_API.md`,
`cnpj-mapas-investigacao-fase-6.md`, `cno-geolocation-contract.md`,
`cnae-ibge-api-handoff.md` e `cnae-ibge-integracao-contrato.md`.

A entrega da Etapa 5 prevalece sobre descrições históricas de filtros opcionais,
território imediato e instruções antigas de Run Python File. Frontend, Busca,
detalhes e Obras conservam seus contratos. Nenhum predecessor foi alterado.

| Dimensão | Evidência disponível | Pendência |
| --- | --- | --- |
| Funcional do cliente | Etapa 5 registra 307 testes unitários e 40 cenários Chromium com fixtures; fechamento registra 66 testes e oito cenários focados | Sem preocupação nova, não repetir suítes aprovadas |
| Compatibilidade real | Contrato de release/filtros/contexto B2B implementado | Respostas reais e renderização controlada, sem chamadas extras fora do orçamento |
| Latência API/PostgreSQL | Tempos históricos não são deste recorte | Critério aprovado, limites reais e tempos/logs do ensaio |
| Cancelamento SQL | Aborto do cliente provado isoladamente | Evidência de término/cancelamento no servidor HTTP real |

Fixtures não certificam publicação operacional, serviços externos, desempenho,
SQL ou aceite integral da Fase 6. Não há evidência operacional nova nesta preparação.

## Recorte candidato e campos obrigatórios

Único candidato: `uf=MG&municipio=4123&cnaes=5611201&atividade_escopo=principal`.
São literais propostos para revisão, **não domínios confirmados**. Confirmar no
domínio Receita a UF, pertencimento do município à UF e CNAE publicado, mediante
evidência fornecida pelo operador. Não inferir por nome, TOM, IBGE, prefixo ou
correspondência CONCLA. Não consultar a API para preencher esta ficha.
Sem situação cadastral, secundárias, datas, segmentos, versão editorial ou
outro território implícito. CNAE/município não garantem custo limitado.

Na preparação futura, registrar cada definição com valor, responsável,
data/hora com offset/fuso e referência à evidência disponível. Ausência permanece
pendência, nunca aprovação presumida; não exige preenchimento manual pelo usuário.

| Campo | Valor atual | Evidência/confirmador/data |
| --- | --- | --- |
| Responsável pela execução e pela aprovação | PENDENTE | PENDENTE |
| Data/hora/fuso do ensaio | PENDENTE | PENDENTE |
| Origem HTTP(S), sem caminho/query/credenciais | PENDENTE | PENDENTE |
| Release CNPJ ativa loaded esperada | PENDENTE | PENDENTE |
| Domínios MG, município Receita 4123 e CNAE 5611201 | PENDENTE | PENDENTE |
| Aprovação explícita deste recorte e revisão de custo | PENDENTE | PENDENTE |
| Orçamento total de GETs, incluindo auxiliares | PENDENTE | PENDENTE |
| Inventário de auxiliares: URL, quantidade, finalidade e responsável | PENDENTE | PENDENTE |
| Limite de pontos por mapa | PENDENTE | PENDENTE |
| Página única e tamanho de lista (contrato: 10/25/50) | PENDENTE | PENDENTE |
| `include_total` da lista (proposta: false, a confirmar) | PENDENTE | PENDENTE |
| Teto de bytes por resposta e eventual teto total | PENDENTE | PENDENTE |
| `statement_timeout` efetivo nas conexões HTTP reais | PENDENTE | PENDENTE |
| `lock_timeout` efetivo nas conexões HTTP reais | PENDENTE | PENDENTE |
| Prazo total e mecanismo de interrupção no servidor | PENDENTE | PENDENTE |
| Prazo total do cliente, incluindo leitura do corpo | PENDENTE | PENDENTE |
| Procedimento de timeout/cancelamento e confirmação de término | PENDENTE | PENDENTE |
| Critério aprovado de latência por GET e alcance da avaliação | PENDENTE | PENDENTE |
| Referência datada de configuração/logs do servidor | PENDENTE | PENDENTE |
| Autorização explícita posterior para uma rodada | NÃO CONCEDIDA | PENDENTE |

O desenho tem quatro GETs empresariais; **quatro não é orçamento aprovado**.
Total planejado = quatro + auxiliares enumerados e aprovados. Evidências já
fornecidas não exigem novas chamadas. Se a confirmação exigir consultas auxiliares,
elas precisam de autorização e orçamento próprios; não acrescentar descoberta
automática ao executor. Navegador pode gerar domínios, geometria, tiles e consultas
empresariais: contabilizar tudo, evitando uma segunda rodada inadvertida.
Não herdar 5/15/20 segundos, 10 pontos/itens ou 5 MiB dos planos antigos.
Timeout SQL é por instrução, não prazo total do endpoint; configuração do terminal
cliente não configura conexões persistentes do servidor.

## Plano de URLs — modelos, não executáveis

`{ORIGEM}`, `{RELEASE_URLENCODED}`, `{PONTOS}`, `{PAGINA}`, `{TAMANHO}` e
`{INCLUDE_TOTAL}` são pendências. Só após preenchimento gerar e revisar URLs
absolutas completas. A mesma release esperada e o mesmo recorte vão nos quatro GETs.

```text
1. {ORIGEM}/api/v1/receita-federal/cnpj/estabelecimentos/mapa/?uf=MG&municipio=4123&cnaes=5611201&atividade_escopo=principal&release={RELEASE_URLENCODED}&limit={PONTOS}
2. {ORIGEM}/api/v1/receita-federal/cnpj/estabelecimentos/mapa/resultados/?uf=MG&municipio=4123&cnaes=5611201&atividade_escopo=principal&release={RELEASE_URLENCODED}&page={PAGINA}&page_size={TAMANHO}&include_total={INCLUDE_TOTAL}
3. {ORIGEM}/api/v1/receita-federal/cnpj/socios/mapa/?uf=MG&municipio=4123&cnaes=5611201&atividade_escopo=principal&release={RELEASE_URLENCODED}&limit={PONTOS}
4. {ORIGEM}/api/v1/receita-federal/cnpj/socios/mapa/resultados/?uf=MG&municipio=4123&cnaes=5611201&atividade_escopo=principal&release={RELEASE_URLENCODED}&page={PAGINA}&page_size={TAMANHO}&include_total={INCLUDE_TOTAL}
```

Executar sequencialmente; primeira falha encerra a rodada e deixa o restante
**não medido**. Sem Obras, detalhes, POST, redirects, retries, polling, refetch
ou paginação acumulada. Divergência de release/filtros/contexto também deve
interromper antes da próxima área. `limit` não limita contagens completas.

## Revisão dos executores e decisão

| Arquivo | Achado por leitura | Decisão para este ensaio |
| --- | --- | --- |
| `measure-map-contracts.ps1` | Territorial, inclui Obras, prossegue após falha; sem teto de bytes/bloqueio explícito de redirects ou evidência do servidor | Não usar |
| `measure_map_contracts.py` | Plano territorial com Obras e prosseguimento após falha; transporte sem redirect/retry, prazo total em processo e teto fixo 5 MiB | Não usar plano; transporte candidato condicionado aos limites aprovados |
| `measure_cnpj_b2b.py` | Mapas somente, segmentos/versão antigos, valores históricos e sem trava de evidência do servidor | Não usar |
| `measure_phase6_acceptance.py` | Seis GETs, inclui Obras e herda segmentos antigos; declaração de limites sem verificação automática | Não usar |

O transporte existente descarta campos não selecionados do JSON e não guarda o
corpo bruto; `all_ok` mede envelope básico, não compatibilidade contratual. Seu
teto de bytes fixo impede reutilização automática com outro orçamento. Um futuro
executor deverá preservar respostas literais completas dentro do teto, distinguir
bytes observados de tamanho total desconhecido em interrupções e verificar o par
antes de avançar. Não alterar os predecessores para ampliar este ensaio.

**Nenhum executor novo/adaptado nesta entrega:** faltam recorte confirmado,
orçamento e limites. A ficha é documental e incapaz de realizar HTTP. Executores
antigos continuam existentes, mas não são autorizados para esta rodada; não
executá-los nem em modo real nem para gerar um plano deste ensaio.

Quando os campos forem definidos, adaptar somente o executor CNPJ necessário
no B-Atlas. Deve permanecer bloqueado por padrão, inclusive no Run Python File,
exigir autorização explícita e declaração/evidência datada do servidor antes
de criar transporte, sem interpretar declaração como verificação automática.
Validar só offline: plano seco sem imports/configuração operacional e transporte
simulado com rede proibida. Cobrir falta de campos/evidência/autorização, quatro
URLs idênticas no recorte, ordem, limite de chamadas/bytes/prazo total, redirects,
erro HTTP/JSON, timeout/aborto, preservação literal e interrupção na primeira falha
ou incompatibilidade. Esses testes estão **pendentes de executor definido**, não
foram substituídos por testes frontend ou dry-run dos planos antigos.

## Instrução manual copiável para o operador

```text
Não executar HTTP agora. Abrir docs/aceite-operacional-cnpj-ficha.md no VS Code.
1. Consolidar as definições e evidências datadas dos domínios, release e limites
   efetivos nas conexões HTTP reais, inclusive persistentes. Identificar responsável.
2. Aprovar um único recorte, orçamento completo, limites e critério de latência.
3. Solicitar a adaptação limitada do executor CNPJ e conferir os testes simulados
   e o plano seco offline. Revisar as quatro URLs completas e os auxiliares.
4. Obter autorização explícita posterior para uma única rodada. Até lá, não usar
   Run Python File nos executores existentes, não abrir URLs empresariais na API.
5. Somente com executor validado e autorização: abrir o arquivo indicado pelo
   handoff no VS Code e usar Run Python File conforme suas instruções finais.
   Não executar outro piloto/navegador empresarial em paralelo.
6. Primeira falha: parar, preservar relatório parcial e marcar restantes não medidos.
   Timeout/fechar cliente não prova cancelamento SQL. O responsável do servidor
   deve correlacionar requisição/conexão/instruções (inclusive workers), comprovar
   término ou cancelamento nos logs/observabilidade aprovados e registrar data/fuso.
   Ausência de log HTTP ou processo cliente encerrado não basta. Sem prova de
   término, não tentar novamente. Nova rodada exige nova autorização/orçamento.
7. Entregar relatórios e evidências abaixo para avaliação, sem concluir aceite
   integral apenas por HTTP 200 ou all_ok.
```

O nome/comando do futuro executor permanece pendente; nenhum comando real
foi inventado para contornar a falta de definições.

## Ficha de avaliação dos relatórios

Para cada GET: ordem/área, URL exata e parâmetros enviados, início/fim com
data/hora/offset/fuso, HTTP recebido ou `status=null`, bytes observados, corpo
completo ou motivo de interrupção, tempo HTTP e tempo total cliente (unidades e
estágios declarados), erro literal e IDs de correlação disponíveis. Guardar
`events.jsonl`, `summary.json`, respostas literais e logs datados do servidor.
Não chamar tamanho parcial de tamanho total; ausência de resposta é desconhecida.

Registrar separadamente orçamento planejado/consumido, GETs auxiliares, restantes
não medidos, release esperada/recebida, `filters`, `b2b_context` e publicação/origem.
Conferir igualdade contratual por par mapa/lista antes de combinar pontos com
resultados. HTTP 409 conserva evidência divergente; não ajustar metadados.
Igualdade de metadados **não prova snapshot entre GETs** ou estabilidade durante
alteração de tabelas na mesma release.

Conferir cobertura literal: unidade, `results_total`, `points_total`,
`without_coordinates_total`, `returned_points`, `limit`, `maximum_limit`,
`truncated`, `points_match_results`. Onde totais forem conhecidos, verificar
`results_total = points_total + without_coordinates_total`; não inferir totais
quando null/ausentes. Primeira página não prova universo completo nem permite
comparar todos os IDs; nenhum ponto fora da primeira página é automaticamente erro.
Preservar `count`, flags/links de paginação e valores desconhecidos.

Empresas: estabelecimento/CNPJ literal e identidade técnica publicada. Sócios:
`(release, participation_id, establishment_id, cnpj)`; preservar os pares,
`establishment`, `company`, `partner`, `participation` e `geo_link_id` quando
publicado. Documentos mascarados/nomes não provam identidade civil. Preservar
zeros, null, vazios, duplicatas e relações sem coordenadas, sem deduplicação.
Coordenada de Sócios pertence ao estabelecimento. Pontos exigem disponibilidade,
contexto compatível, não obsoletos, coordenadas válidas/finitas e precisão postal;
sem coordenadas permanece textual. Nenhum ponto válido deixa o percurso com
pontos sem comprovação operacional.

Erro nunca vira zero. Latência por GET deve ser comparada somente ao critério
aprovado, separada de prazo protetivo. Logs devem identificar tempos SQL/estágios,
limites efetivos e término/cancelamento; sem logs, SQL/custo completo ficam
desconhecidos. Um ensaio não mede p95, concorrência ou desempenho de outros
recortes. Renderização real e auxiliares externos precisam de evidência própria
autorizada e contabilizada, sem repetir consultas pesadas automaticamente.

## Handoff finito para thread própria da API

Dependência atual: comprovar limites/prazo total e observabilidade de término
nas conexões HTTP reais. Não há prova nesta thread de que faltem no backend.
Se não puderem ser comprovados, manter bloqueio e enviar:

```text
Escopo: preparação/diagnóstico limitado dos quatro GETs CNPJ desta ficha.
Commits B-Atlas/API: [copiar bases e atualizar no momento do handoff].
Anexar ficha preenchida, URLs, orçamento, responsável, data/fuso, evidências
efetivas de timeout SQL/lock/prazo servidor e procedimento de cancelamento.
Se houve ensaio autorizado, anexar relatórios/corpos/logs e status ou null,
endpoint/estágio comprovado, término e endpoints não medidos.
Solicitar comprovação do limite/observabilidade faltante; diagnóstico de falha
somente no estágio evidenciado. Sem evidência nova, não presumir causa SQL.
Não alterar produtor, índices, migrations, cargas, universo contado ou identidade.
Qualquer implementação backend exige escopo/autorização na thread própria.
```

Contagens históricas interrompidas antes de geolocalização não diagnosticam este
candidato. Sem dados novos, há apenas pendências documentadas, nenhuma correção
API e nenhum aceite operacional.

## Verificação desta preparação

Artefato somente documental; nenhum transporte importado/executado, nenhuma rede,
SQL, banco, benchmark, carga, manutenção ou suíte repetida. UTF-8, whitespace,
referências locais e escopo verificados; `src`, executores e API preservados.
Commit e sincronização autorizados posteriormente pelo usuário em 09/10/2026.
Testes simulados/plano seco do executor ficam
pendentes até haver definições suficientes. Esta preparação não autoriza o ensaio.
