# Prompt — preparação do aceite operacional CNPJ da Fase 6

Preparado em 09/10/2026 após a entrega das Etapas 1 a 5 dos filtros CNPJ.
Executar exclusivamente a preparação do ensaio manual posterior. Não existe
Etapa 6 dessa revisão nem Fase 7. Preserve a implementação frontend entregue.

Leia integralmente `docs/contrato-depuracao-filtros-cnpj.md`, especialmente
a entrega da Etapa 5 e seu plano manual, `docs/fase-6-plano-operacional.md`,
`docs/contrato-modos-busca-mapa.md`, `docs/cnpj-filtros-b2b.md` e os contratos
API citados nesses documentos. Inspecione os worktrees B-Atlas e API somente
por leitura; preserve mudanças alheias e registre os commits atuais.

Trabalho autorizado:

1. Consolidar as pendências operacionais de Empresas/Sócios no modo Mapa,
   distinguindo aceite funcional com fixtures de compatibilidade real,
   latência API/PostgreSQL e cancelamento SQL. Não repetir suítes aprovadas
   sem mudança ou preocupação nova. Busca, detalhes e Obras mantêm contratos.
2. Preparar uma ficha de ensaio com origem/release e um único recorte completo,
   explícito e limitado. Candidato para revisão: UF MG, município Receita 4123,
   `cnaes=5611201&atividade_escopo=principal`. Exigir confirmação dos domínios
   publicados pelo operador; não inferir códigos nem consultar a API por ele.
   Não inserir situação Ativa, secundárias, datas ou território implícitos.
3. Solicitar os dados que faltarem: orçamento total de chamadas (incluindo
   auxiliares), pontos, página/tamanho da lista, teto de bytes, limites efetivos
   SQL/lock nas conexões HTTP reais, prazo total do servidor e do cliente,
   procedimento de timeout/cancelamento e critério aprovado de latência.
   Registrar data/fuso, responsável e evidências. Não inventar valores nem
   herdar automaticamente os valores históricos 5/15/20 s como aprovação.
   Enquanto faltarem definições, produzir ficha com pendências explícitas
   e manter qualquer executor incapaz de realizar HTTP.
4. Revisar os executores existentes contra a política da Etapa 5. Depois de
   definidos recorte e orçamento, adaptar somente o executor manual necessário
   no B-Atlas, reutilizando transporte existente se atender aos limites.
   Não alterar os predecessores para ampliar o ensaio; não incluir Obras,
   detalhes, POST, redirects, retries ou paginação acumulada. Executar sequencialmente
   mapa/lista com filtros idênticos em cada área e interromper na primeira falha.
   Exigir declaração/evidência do servidor antes de HTTP; declaração do operador
   não equivale a verificação automática dos limites pelo cliente.
5. Validar o executor somente offline com testes de transporte simulado e
   plano seco, garantindo zero rede e preservando os bloqueios operacionais.
   Documentar como o operador executará no VS Code após autorização explícita
   e como confirmará término no servidor antes de uma nova tentativa.
6. Preparar a avaliação dos relatórios: URLs/filtros, data/fuso, HTTP ou
   `status=null`, bytes, tempos por GET, respostas literais, logs do servidor,
   release/filtros/contexto B2B, cobertura/truncamento e identidades técnicas.
   Preservar zeros, null/vazios, documentos mascarados, duplicatas e registros
   sem coordenadas. Igualdade de metadados não prova snapshot entre GETs;
   primeira página não prova universo completo; `limit` não limita contagens.
   Erro não vira zero. Timeout do cliente não comprova cancelamento SQL.
7. Se houver dependência backend, documentar handoff para thread própria da API
   com evidência e escopo finito. Não alterar API/produtor, índices, migrations,
   cargas ou universo contado. Sem dados operacionais novos, registrar pendências
   e concluir apenas os artefatos independentes autorizados.

Não executar HTTP operacional, SQL, banco, benchmarks, cargas, manutenção ou
executor em modo real. Não declarar aceite integral da Fase 6 com fixtures.
Não comitar nem sincronizar nesta nova thread sem solicitação explícita.
Entregar ficha, executor offline se houver definições suficientes, verificações,
limites e instrução manual copiável. Esta preparação não autoriza o ensaio.
