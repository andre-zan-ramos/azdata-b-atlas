# Filtros cartográficos CNPJ B2B

2026-10-05. Contrato API: `docs/cnpj-filtros-b2b-implementacao.md` no checkout API.
Complementa modos Busca/Mapa; não declara aceite integral Fase 6.

Empresas e Sócios no modo Mapa oferecem catálogo local da API, seleção múltipla,
CNAEs manuais e escolha principal/principal ou secundárias. Cada segmento permite
inspecionar seus códigos e escopo. União entre atividades e AND aos outros filtros;
nenhuma classificação por nome. Secundárias estão indisponíveis até confirmação
da relação normalizada para a release pelo produtor, indicada pela API.

Situação permanece opcional. Início de atividade e evento da situação cadastral
têm intervalos separados e inclusivos. A interface explica o significado do
evento e a exclusão de datas ausentes quando há intervalo. Aplicar atualiza URL,
reseta página e mantém retorno; digitação/checkbox não disparam consulta pesada.
Consulta territorial mantém interação anterior. Filtro mínimo obrigatório ainda
não foi adotado; decisão pendente, filtros opcionais preservados.

Empresas usa nova alternativa `/estabelecimentos/mapa/resultados/`. Release,
filtros e contexto B2B precisam coincidir com o mapa antes de exibir pontos.
Sócios conserva a alternativa por pares. Registros sem coordenadas permanecem
textuais. Compatibilidade não garante snapshot entre requisições.

Novos filtros são próprios do modo Mapa: ao alternar, o estado do Router conserva
o recorte de cada modo; não transportar parâmetros B2B a endpoints Busca que não
os contratam. URL compartilhada conserva seleção, versão, datas e escopo.

O piloto `scripts/measure_cnpj_b2b.py` é manual, Run Python File no VS Code.
Configuração inicial: Restaurantes, principal, MG/4123, 10 pontos, 20 segundos.
Sem situação/datas implícitas; altere CONFIG explicitamente para comparar variantes.
Não foi executado nesta entrega. Falha para a sequência sem retry, preservando
relatório; timeout não confirma cancelamento SQL. Metas de desempenho, profile
SQL e navegador real seguem pendentes.

ETL recomendado no Repositórios para classificação oficial/hierarquia e publicação
local; mapeamento editorial versionado continua revisão de produto. A API não
consulta documento externo em cada GET.

Validação final: 204 testes em 23 arquivos passaram com `--maxWorkers=1`; build
e `git diff --check` passaram. O piloto teve somente seu plano offline validado.
Uma asserção anterior de pontos foi corrigida para aguardar compatibilidade das
duas respostas, sem mudar o critério esperado. Não houve navegador real.
