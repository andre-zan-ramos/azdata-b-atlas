# Prompt — Etapa 2: CNAE geral

Implementar exclusivamente a Etapa 2 — CNAE geral — de
`docs/contrato-depuracao-filtros-cnpj.md` no B-Atlas, em Empresas e Sócios no
modo Mapa.

Leia o contrato completo e inspecione a implementação atual antes de editar.
A Etapa 1 já está implementada: preserve a elegibilidade compartilhada, a
separação rascunho/aplicado, o domínio municipal independente, os bloqueios de
queries/refetch, o histórico, a paginação e a limpeza com cancelamento.

Implementar:

- Um seletor compartilhado de CNAEs em diálogo, usando o domínio Receita
  `dominios/cnaes/`, com busca por descrição e paginação explícita. Exibir
  códigos literais e descrições publicados; permitir CNAEs fora dos quatro
  segmentos. Não baixar todo o domínio na abertura nem filtrar apenas a página
  carregada. Não inventar filtro API por código; código exato pode ser informado
  explicitamente e validado na consulta CNPJ, conforme o contrato.
- Seleção múltipla persistente ao buscar, paginar e reabrir; remoção individual
  e limpeza; limite visível de 100 CNAEs, sem truncamento silencioso.
- Confirmar, Cancelar e Limpar no diálogo. Confirmar altera somente o rascunho
  externo; Cancelar/Escape descarta a edição interna. Enter, seleção e confirmação
  não consultam endpoints empresariais nem alteram a URL. Apenas Aplicar filtros
  valida e aplica o recorte completo, reiniciando a página.
- Resumo externo de códigos/descrições, quantidade e escopo. Manter a indicação
  de alterações ainda não aplicadas, inclusive durante a paginação aplicada.
- Escopo principal/principal ou secundárias, habilitando secundárias somente
  pela capacidade publicada pela API e certificada para a release. Separar a
  leitura dessa capacidade da apresentação dos segmentos; o endpoint existente
  pode continuar sendo utilizado para essa finalidade.
- Catálogo IBGE/CONCLA como consulta auxiliar identificada, preservando os
  controles e contratos existentes quando adequado. Selecionar subclasses
  literais; não expandir níveis superiores nem converter correspondências.
  CNAE IBGE ausente na Receita mantém a seleção e recebe erro explícito.
- Retirar os quatro segmentos como caminho principal. URLs com `segmentos`
  devem apresentar versão e códigos explícitos para revisão, com resolução sob
  demanda. Segmento desconhecido ou versão divergente exige correção, sem
  transformação silenciosa. Após revisão confirmada, usar `cnaes` e
  `atividade_escopo`, removendo `segmentos/catalog_version` dessa nova seleção.
- Remover o campo duplicado `cnae` nas duas interfaces. Tratar URL antiga com
  `cnae` válido e isolado por normalização explícita para `cnaes` e escopo
  `principal`, preservando literal, território, demais filtros e `return_to`.
  Combinações conflitantes continuam bloqueadas e pedem revisão.
- Acessibilidade própria do diálogo: título, foco inicial, contenção de foco,
  retorno ao acionador, teclado e usabilidade em 375/1440 px. Checkboxes do novo
  seletor devem ter dimensões próprias, sem alterar indiscriminadamente os
  inputs do restante da aplicação.

Preservar OR entre CNAEs e AND com território/período/demais filtros,
compatibilidade mapa/lista, release, filtros, contexto B2B, códigos com zeros
iniciais, identidades, duplicatas e registros sem coordenadas. Não inserir
atividade, situação cadastral, datas ou município implícitos.

Não implementar o diálogo temporal da Etapa 3, a seção Demais consultas ou a
harmonização geral da Etapa 4, nem declarar concluída a Etapa 5 ou o aceite
operacional da Fase 6. Busca textual, detalhes e Obras conservam seus contratos.
Se surgir necessidade de endpoint/parâmetro novo, documentar a dependência e
entregar API/OpenAPI antes de consumir; não ampliar silenciosamente o escopo.

Validar com mocks/interceptação nas duas áreas:

- Zero requisições empresariais ao abrir vazio/incompleto, abrir o diálogo,
  buscar/paginar CNAEs, selecionar, confirmar, cancelar ou limpar a edição.
- CNAE fora dos segmentos, múltipla seleção através de páginas, reabertura,
  remoção, limite de 100, códigos literais e ausência de filtros implícitos.
- Confirmar altera só o rascunho; Cancelar/Escape preserva o anterior; Enter não
  aplica. Aplicar recorte elegível envia os mesmos filtros para mapa/lista.
- URLs antigas `cnae`/`segmentos`, versões divergentes, conflitos, histórico,
  paginação aplicada e `return_to`.
- Erro Receita conserva a seleção; IBGE não substitui a fonte Receita;
  secundárias permanecem bloqueadas quando não certificadas.
- Regressões da Etapa 1, incluindo cancelamento e respostas tardias após limpeza.

Não executar buscas na API operacional, banco, benchmarks ou cargas. Usar
fixtures para erros e validação de navegador; bloquear tráfego operacional.
Execute os testes pertinentes e o build, atualize a documentação da etapa e
informe resultados e limitações. Não comitar nem sincronizar nesta execução.
