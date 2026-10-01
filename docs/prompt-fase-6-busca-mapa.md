Quero implementar exclusivamente a “Fase 6 — Harmonização e validação integral” definida em:

docs/contrato-modos-busca-mapa.md

Leia o contrato integralmente antes de alterar arquivos. Não reabra as Fases 1 a 5 nem amplie a semântica dos contratos sem evidência e aprovação próprias.

Repositórios:

- B-Atlas: C:\Users\andre\Documents\Projetos Python\Django+React\azdata\b-atlas
- AzData API: C:\Users\andre\Documents\Projetos Python\Django+React\azdata\api

Contexto concluído:

- Fase 1 no B-Atlas: 4713cb8.
- Fase 2: API 66f682f; B-Atlas 98c3db2.
- Ajuste visual do B-Atlas: f700a0f.
- Fase 3: API dd94e1e; B-Atlas 1479829.
- Fase 4: API 20a73c3; B-Atlas ea7bd99.
- Fase 5: API dbf1c1f; B-Atlas implementado, validado e sincronizado no commit que contém este prompt. Identifique o commit efetivo no histórico do B-Atlas antes de trabalhar.

Leia também:

- B-Atlas: docs/fase-5-socios-mapa.md.
- API: docs/cnpj-socios-mapa-contract.md e docs/cno-geolocation-contract.md.
- Contratos, tipos, clientes, filtros, paginação, modelos managed=False, serviços, serializadores e testes pertinentes das três áreas.

Objetivo da Fase 6:

1. Inspecionar os worktrees e preservar alterações alheias.
2. Apresentar uma análise curta das diferenças atuais entre as três áreas, lacunas de validação e arquivos previstos antes de editar.
3. Uniformizar responsividade, linguagem e estados de carregamento, vazio, erro, indisponibilidade e truncamento.
4. Revisar acessibilidade do seletor Busca | Mapa, filtros, seleção territorial, popups, teclado e alternativa textual.
5. Validar navegação cruzada, return_to, filtros, modo, página, histórico, recarregamento, URLs compartilháveis e telas estreitas.
6. Verificar que mapa e lista expõem o mesmo recorte declarado e tornam explícitas cobertura, limites e compatibilidade de publicação.
7. Avaliar volume/desempenho dos contratos cartográficos com testes isolados e evidência disponível. Para medições que dependam do banco compartilhado, preparar comandos limitados para execução pelo usuário; não executar sem autorização explícita.

Semânticas obrigatórias:

- Empresas: o ponto identifica o estabelecimento e seu CNPJ completo.
- Obras: o ponto identifica uma ocorrência técnica de obra, sem deduplicar CNO.
- Sócios: a coordenada pertence exclusivamente ao estabelecimento; sócio/grupo e participação são contexto publicado. Preservar todos os pares participação/estabelecimento e suas identidades técnicas.
- Na Fase 5, itens co-localizados são reunidos visualmente em um marcador com contagem e todos os itens retornados no popup, sem deduplicação semântica.
- Documento mascarado não prova identidade civil única; nomes não comprovam vínculos.
- Preservar CNPJ, documentos, códigos, zeros à esquerda, null, strings vazias, duplicatas e valores oficiais.
- Não substituir coordenadas por centroides, geometrias IBGE/TSE ou referências territoriais. Usar apenas available, não obsoletas, sem context_mismatch, com postal_code_approximation e coordenadas válidas.
- IBGE serve a estados/geometrias e à ponte oficial; filtros mantêm os códigos Receita/TOM apropriados a cada domínio.
- Registros sem coordenadas permanecem nos resultados textuais.
- Não montar universo juntando páginas no navegador nem disparar detalhes por ponto.
- Preservar paginação no servidor, count: null e AbortSignal.
- GET sem efeitos colaterais; sem polling, retry automático novo ou geocodificação implícita. Solicitação de geolocalização continua sendo POST explícito, limitado e sem repetição automática.

Pendências conhecidas da entrega anterior:

- API CNPJ: 59 testes passaram; B-Atlas: 184 testes em 19 arquivos passaram com --maxWorkers=1; builds B-Atlas/API web, mojibake e git diff --check passaram.
- A suíte conjunta CNPJ/CNO encontrou uma falha preexistente: CnoApiTests.test_static_openapi_matches_response_fields espera sete paths, mas docs/openapi-cno-v1.json possui oito. Confirmar o contrato vigente e corrigir a asserção de teste de forma fundamentada, sem remover rotas nem enfraquecer a verificação.
- Não houve verificação visual real em navegador nem medição de desempenho em PostgreSQL. Não apresentar testes com mocks como evidência de validação visual ou desempenho produtivo.
- CNPJ não possui versionamento por linha: comparação de release/filtros e detecção de mudança não equivalem a snapshot transacional entre requisições. Manter essa limitação explícita.

Validação obrigatória:

- Testes focados e regressões de Busca/Mapa nas três áreas.
- Testes de identidade, duplicatas, coordenadas inválidas, cobertura/truncamento, compatibilidade, paginação e ausência de cascata/efeitos colaterais.
- Suíte API pertinente em SQLite isolado e suíte frontend pertinente.
- Builds B-Atlas e API web, acentuação/mojibake e git diff --check.
- Verificação visual e de teclado nas telas largas/estreitas quando a ferramenta de navegador estiver disponível; registrar concretamente qualquer bloqueio.
- Revisão completa dos diffs, separando achados anteriores de regressões introduzidas.

Não executar migrations, cargas, scripts de produção, comandos de índices ou operações no banco compartilhado sem autorização explícita. Não alterar o produtor nem criar novas fontes ou relações inferidas. Não fazer commit nem push sem solicitação explícita nesta nova thread.

Ao finalizar, apresentar mudanças, evidências, limitações e o estado de aceite da Fase 6 e do contrato integral.
