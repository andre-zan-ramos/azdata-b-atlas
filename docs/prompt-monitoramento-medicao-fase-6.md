Quero monitorar e analisar exclusivamente o resultado da medição manual dos
contratos cartográficos da Fase 6. Eu executarei o arquivo Python no VSCode;
você acompanha os logs e analisa as evidências. Não execute a medição por mim.

Repositórios:
- B-Atlas: C:\Users\andre\Documents\Projetos Python\Django+React\azdata\b-atlas
- API: C:\Users\andre\Documents\Projetos Python\Django+React\azdata\api

Leia antes de agir:
- B-Atlas: scripts/measure_map_contracts.py.
- B-Atlas: docs/fase-6-harmonizacao-validacao.md.
- B-Atlas: docs/contrato-modos-busca-mapa.md.
- API: docs/cnpj-socios-mapa-contract.md e docs/cno-geolocation-contract.md.

Inspecione os worktrees e preserve as alterações existentes. A implementação
da Fase 6 pode estar ainda sem commit. Não faça commit ou push nesta thread.

O CONFIG já está preenchido para Belo Horizonte/MG: Receita `4123`, TOM `4123`
e a origem validada da configuração local do B-Atlas. Basta Run Python File,
sem argumentos nem edição de configuração. Não execute o script por mim.

O executor usa somente HTTP e biblioteca padrão, sem carregar Django ou
conectar diretamente ao banco. CONFIG contém origem, UF e códigos municipais
literais Receita/TOM. Origem vazia usa VITE_AZDATA_API_BASE_URL do ambiente ou
.env.local/.env. Não mostre segredos desses arquivos. Não infira códigos por
nome, IBGE ou pela igualdade entre os dois domínios. Se faltar configuração,
peça os valores necessários e prepare o arquivo; não use recorte nacional.

Eu iniciarei o arquivo com Run Python File. Não existe input() nem confirmação
textual no executor. Ele faz um GET por área, sequencialmente, sem retry,
redirecionamento, paginação acumulada, detalhes, POST ou geolocalização:
- Empresas: /api/v1/receita-federal/cnpj/estabelecimentos/mapa/.
- Sócios: /api/v1/receita-federal/cnpj/socios/mapa/.
- Obras: /api/v1/receita-federal/cno/obras/mapa/.

Limite padrão: 10 pontos; máximo configurável no executor: 100. Prazo total
por tentativa: até 20 segundos, imposto por processo separado. Teto de leitura:
5 MiB. Uma falha deve ficar registrada; não repetir a mesma tentativa nem buscar
novos identificadores ou recortes automaticamente.

Os relatórios são escritos em:
var/map-contract-measurements/<timestamp UTC>/events.jsonl
var/map-contract-measurements/<timestamp UTC>/summary.json

Quando eu informar que iniciei, localize o diretório dessa execução, informe
seu caminho e acompanhe somente esses arquivos locais. Se houver mais de uma
execução plausível, confirme qual analisar. Não interprete um relatório antigo
como atual. Você pode reler os logs locais enquanto o processo está ativo,
mas não dispare chamadas HTTP, scripts ou diagnósticos de banco.

Analise:
1. Eventos request_started, heartbeat, request_finished, run_interrupted e
   run_finished. Distinga tentativa em andamento, erro, timeout e conclusão.
2. Status HTTP, http_ms, elapsed_ms, response_bytes, release, source_file_id,
   identity, filtros publicados, coverage e points_received de cada área.
3. Coerência de results_total, points_total, without_coordinates_total,
   returned_points, limit, maximum_limit e truncated. Sócios conta relações
   participação/estabelecimento, Empresas conta estabelecimentos e Obras
   conta ocorrências técnicas. Não compare esses totais como a mesma unidade.
4. Correspondência dos filtros devolvidos aos códigos e UF enviados, preservando
   zeros, null e valores oficiais. Informe ausência de metadados e erros sem
   transformá-los em zero, false ou indisponibilidade definitivamente provada.
5. O que a amostra permite concluir sobre volume, cobertura e tempo HTTP e o
   que depende de logs SQL/servidor adicionais fornecidos por mim.

O script não grava pontos individuais no relatório; não prometa auditoria de
identidade, duplicatas ou coordenadas de cada ponto a partir desses arquivos.
http_ms inclui rede, backend, leitura e análise do JSON; elapsed_ms inclui
também inicialização/encerramento do processo. Não são tempo SQL isolado,
EXPLAIN, memória PostgreSQL nem benchmark estatístico. Uma tentativa por área
não permite calcular percentis. Timeout do cliente não garante cancelamento
da consulta no servidor; limit restringe pontos devolvidos, não o custo das
contagens/varreduras do recorte.

Não execute migrations, cargas, manutenção, ANALYZE, índices, EXPLAIN ou comandos
contra o banco compartilhado sem autorização explícita própria. Não altere
produtor, contratos ou UI durante este monitoramento. Se surgir problema,
apresente evidência e próximo passo limitado para minha execução.

Finalize com uma tabela por área, achados sustentados pelos logs, limitações,
arquivos analisados e impacto no aceite da Fase 6. Verificação visual continua
pendente independentemente do resultado desta medição. Preserve a limitação
de CNPJ sem versionamento por linha: release/filtros não provam snapshot
transacional entre requisições. Não declare aceite integral sem evidência.
