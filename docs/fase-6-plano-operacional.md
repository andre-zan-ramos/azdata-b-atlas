# Fase 6 — plano limitado de aceite operacional

Preparado em 06/10/2026. Bases inspecionadas: B-Atlas `560221e65c581ac778c23ddad14531032557a632`,
API `5952cefb43baf3665cde5e2c6aa48f1c0088e34b`. Execução exclusivamente pelo
operador no VS Code. Nenhuma chamada operacional foi feita nesta revisão.

## Ensaio definido antes da execução

Reutiliza `measure()`/`request_once()` de `scripts/measure_map_contracts.py` e
o recorte de `scripts/measure_cnpj_b2b.py`. O wrapper
`scripts/measure_phase6_acceptance.py` não inicia serviços nem configura banco.

Município explícito: Belo Horizonte/MG; Receita `4123` em CNPJ, TOM `4123` em
CNO. A coincidência literal foi documentada anteriormente; o operador confirma
os domínios publicados antes de executar, sem inferir códigos pelo nome/IBGE.
CNPJ usa `segmentos=restaurantes`, `catalog_version=b2b-v1`,
`atividade_escopo=principal`. Sem situação ou datas implícitas, sem secundárias.
CNO usa somente UF/TOM. Não executar o ensaio municipal amplo antigo em paralelo.

| Ordem | Endpoint sob `/api/v1/receita-federal/` | Limite |
| --- | --- | --- |
| 1 | `cnpj/estabelecimentos/mapa/` | 10 pontos |
| 2 | `cnpj/estabelecimentos/mapa/resultados/` | página 1, 10 itens, `include_total=false` |
| 3 | `cnpj/socios/mapa/` | 10 relações |
| 4 | `cnpj/socios/mapa/resultados/` | página 1, 10 itens, `include_total=false` |
| 5 | `cno/obras/mapa/` | 10 ocorrências |
| 6 | `cno/obras/` | página 1, 10 itens, `include_total=false` |

Uma requisição por endpoint, sequencial, sem redirects, retries, paginação
acumulada, detalhes, POST, polling ou provedor. Primeira falha encerra a execução;
endpoints restantes ficam **não medidos**. Não iniciar nova rodada antes de
confirmar término do trabalho no servidor. `limit` restringe pontos retornados,
nunca o universo contado. Primeira página textual não prova o universo inteiro.

## Limites e preparação no servidor

Limites propostos para **proteção deste ensaio**, não SLO/meta aprovada de produto:
`lock_timeout=1000 ms`, `statement_timeout=5000 ms` por instrução SQL,
prazo total da requisição no servidor **15 s**, prazo total do cliente **20 s**,
leitura máxima **5 MiB**. Avaliar cada HTTP contra 15 s, registrar interrupções
SQL contra 5 s e cliente contra 20 s. Abaixo de 15 s significa apenas concluir
dentro deste orçamento, sem aprovação automática de desempenho.

Antes de executar, o operador deve confirmar os limites **nas conexões reais
usadas pelo servidor HTTP**, inclusive conexões persistentes, e a aplicação do
prazo total de 15 s pelo servidor. Configurar o terminal do cliente não configura
o PostgreSQL da API. Timeout do proxy/processo não comprova cancelamento SQL;
`statement_timeout` é por instrução e não soma o tempo do endpoint inteiro.
Registrar configuração efetiva, log e término/cancelamento das instruções. Se o
servidor atual não oferece esses limites verificáveis, **não executar este plano**:
a preparação fica pendente para thread própria da API. Este documento não
autoriza alterações operacionais pelo agente.

Após confirmar, preencher `CONFIG.server_limits_confirmed=True` e
`CONFIG.server_evidence` com referência datada à evidência efetiva. Esses campos
são declaração do operador, não verificação automática do executor. Ajustes nos
limites exigem registrar os novos valores antes do ensaio, mantendo
lock < SQL < servidor < cliente <= 20 s. Conferir a origem em
`measure_cnpj_b2b.CONFIG` (inicialmente `http://127.0.0.1:8801`).

```powershell
python scripts/measure_phase6_acceptance.py --dry-run
```

Depois da conferência, usar **Run Python File** no wrapper. Sem confirmação e
referência do servidor ele falha antes de qualquer HTTP. Não executar também os
dois executores predecessores: isso duplicaria as requisições deste plano.

## Evidência a fornecer e avaliação

Fornecer `events.jsonl` e `summary.json` de
`var/map-contract-measurements/<UTC>_phase6/`, junto dos logs datados do servidor.
O relatório registra URL/filtros, HTTP, `http_ms` (transporte/leitura/parse),
`elapsed_ms` (inclui processo), bytes, release/source_file, filtros/contexto,
cobertura, flags de paginação e registros devolvidos literalmente. Há teto de
5 MiB para a resposta de cada GET; arquivos incluem dados oficiais retornados.
`all_ok` verifica apenas sucesso HTTP e envelope básico, **não aceite contratual**.

Avaliar manualmente:

1. Seis respostas completas, erro/timeout ou endpoints não executados; release
   ativa carregada, códigos e filtros declarados conforme o plano.
2. Compatibilidade mapa/lista CNPJ de release/filtros/contexto B2B; CNO por release
   das ocorrências e arquivo declarado no mapa. Página CNO vazia não comprova
   release. Igualdade de metadados não comprova snapshot transacional.
3. `results_total = points_total + without_coordinates_total`, quantidade devolvida
   coerente com `returned_points`, limite/truncamento explícitos e unidades corretas.
   Não comparar totais de estabelecimentos, relações e ocorrências como iguais.
4. Identidades técnicas, zeros, documentos mascarados, duplicatas e valores
   null/vazios conservados; somente coordenadas disponíveis, finitas, compatíveis,
   não obsoletas, não 0/0 e de precisão postal geram pontos. Coordenada de Sócios
   permanece no estabelecimento. Ausência de pontos é cobertura zero observada,
   não sucesso de localização; aceitação do percurso com pontos continua pendente
   se o recorte não contiver nenhum ponto válido.
5. Latência individual contra os orçamentos acima, etapa SQL dominante e término
   no servidor. Logs existentes podem fornecer tempos SQL/serialização e recursos;
   sem esses dados, PostgreSQL/memória/custo completo ficam desconhecidos. Uma
   execução não mede p95, concorrência nem generaliza ao município amplo.

A aprovação de uma meta de latência de produto continua pendente. Não transformar
5/15/20 s em SLO. Catálogo CNAE operacional/publicação e renderização da API real
também não são comprovados por esses seis GETs: precisam de evidência datada
fornecida pelo operador, em sessão de navegador controlada, sem repetir consultas
pesadas automaticamente. Fixtures locais e o cluster CNAE descartável da API
não substituem essa evidência. Não anexar testes com malhas/tiles interceptados
como disponibilidade dos serviços externos.

## Handoff para thread própria da API se houver falha

Enviar commits, URLs exatas, data/fuso, relatórios, configuração de timeout
efetiva e logs. Registrar endpoint/etapa dominante, HTTP recebido ou `status=null`,
valores desconhecidos e endpoints não medidos. Evidência histórica de 05/10:
Empresas COUNT 10114,59 ms e Sócios COUNT 10065,65 ms interrompidos por timeout
SQL de 10 s; Empresas COUNT municipal também interrompido em 20117,90 ms.
Não chegaram à geolocalização/serialização. Isso não diagnostica a execução nova.

Solicitar diagnóstico limitado na etapa comprovada antes de otimizar. Não reduzir
o universo contado, inferir identidade, adicionar índices no produtor ou alterar
contratos nesta thread. Caso 409/incompatibilidade, conservar filtros/release
recebidos; não combinar respostas nem corrigir metadados no consumidor.
Sem relatórios novos, o handoff é uma pendência documentada, não uma correção API.
