# Filtros cartográficos CNPJ B2B

Proposta de revisão em 07/10/2026: [contrato-depuracao-filtros-cnpj.md](contrato-depuracao-filtros-cnpj.md)
define localidade + CNAE e/ou período como mínimo, aplicação explícita,
seletor CNAE geral e diálogos em Demais consultas. Etapas 1 a 3 implementadas,
conforme o contrato e a [entrega CNAE geral](entrega-etapa-2-cnae-geral.md); etapas 4 e 5 pendentes;
as descrições abaixo registram o comportamento anterior.

Evolução em 06/10/2026: `cnae-ibge-frontend.md` descreve consulta assistida ao
catálogo oficial IBGE/CONCLA em Empresas e Sócios no modo Mapa. Seleciona somente
subclasses literais no rascunho de `cnaes`, sem aplicar consultas pesadas até
Aplicar filtros. IBGE, `CnaeRf` e `b2b-v1` permanecem separados; erros Receita
conservam seleção e secundárias dependem exclusivamente da certificação API.

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

Catálogo oficial/hierarquia já publicado pelo produtor e exposto na API em
`5952cef`, integrado no B-Atlas na retomada de 06/10/2026. Mapeamento editorial
versionado continua revisão de produto. A API não consulta documento externo
em cada GET. As evidências abaixo pertencem à entrega B2B original.

Validação final: 204 testes em 23 arquivos passaram com `--maxWorkers=1`; build
e `git diff --check` passaram. O piloto teve somente seu plano offline validado.
Uma asserção anterior de pontos foi corrigida para aguardar compatibilidade das
duas respostas, sem mudar o critério esperado. Não houve navegador real.
