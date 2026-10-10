# Revisão API — Tipo de estabelecimento e domínio CNAE

Trabalhe no checkout `azdata/api`. Leia as instruções locais e inspecione o
contrato atual antes de alterar arquivos. Analise e implemente as correções
necessárias na API; não altere o ETL nem o B-Atlas neste trabalho.

O requisito do usuário é permitir escolher todos os tipos de atividade pelos
CNAEs publicados. Restaurantes, Academias, Lanchonetes e Bares foram exemplos,
nunca uma lista fechada. Não amplie manualmente `SEGMENTS` para tentar cumprir
o requisito e não crie agrupamentos por nomes comerciais ou prefixos.

Inspecione `backend/apps/receita_federal/cnpj/b2b.py`, `views.py`, `filters.py`,
`urls.py`, modelos, paginação, testes, OpenAPI e documentação. Rastreie também,
somente por leitura, a origem ETL de `cnpj_cnaerf` e o catálogo independente
IBGE/CONCLA. Separe evidência de código de evidência operacional da carga.

Contrato esperado:

1. `/api/v1/receita-federal/cnpj/dominios/cnaes/` expõe todo o domínio Receita
   publicado, com código literal, descrição, busca remota e paginação estável.
   Confirme que não depende de `SEGMENTS`, não retorna somente CNAEs presentes
   em um recorte empresarial e não mistura descrições IBGE com Receita.
2. `cnaes` e `atividade_escopo` permitem filtrar CNAEs fora dos quatro exemplos
   nos mapas e resultados de Empresas e Sócios. Preserve união entre códigos,
   combinação com território/datas, identidades, nulos e ausência de duplicação.
3. Revise `/segmentos/`: é um catálogo editorial fechado e não o domínio geral
   de tipos. Corrija descrições e referências que o apresentem como catálogo
   completo. Preserve compatibilidade de URLs e consumidores; não remova o
   endpoint ou renomeie parâmetros sem inventário e plano de transição.
4. Avalie separar `secondary_available` da lista editorial em endpoint de
   capacidades. Só implemente se houver benefício concreto; documente o contrato
   e mantenha a resposta existente compatível. A certificação depende da release
   CNPJ carregada; catálogo IBGE completo não habilita secundárias.
5. Preserve códigos de sete dígitos e zeros iniciais, validação de existência,
   limite atual de 100 códigos explícitos e 200 expandidos. Acesso a todas as
   opções não significa enviar todo o catálogo em uma consulta.
6. IBGE/CONCLA continua sendo classificação independente. Se houver divergência
   de cobertura, exponha o diagnóstico e a responsabilidade do produtor; não
   fabrique conversões, descrições ou registros faltantes na API somente leitura.

No B-Atlas, o campo principal já passou a consumir `dominios/cnaes/` com busca
por `descricao`, `page` e `page_size=10`; envia `cnaes`/`atividade_escopo` apenas
ao Aplicar. Não invente um novo endpoint de tipos se o domínio atual satisfaz
o contrato. Avalie busca exata por código apenas como extensão explícita e
documentada, sem quebrar a busca por descrição existente.

Valide com testes isolados: atividade fora de `SEGMENTS`, busca e paginação do
domínio, zeros iniciais, código ausente, paridade mapa/resultados nas duas áreas,
compatibilidade de segmentos antigos e bloqueio de secundárias não certificadas.
Consultas empresariais de teste devem ter localidade e CNAE e/ou período.
Não execute HTTP operacional, banco compartilhado, migrações, cargas, pipeline,
benchmark ou manutenção. Não faça commit/push sem autorização.

Entregue diagnóstico dos endpoints, alterações e testes executados, limitações
operacionais e handoff do contrato final para o B-Atlas. Se a API já cumprir o
domínio geral, declare isso com evidência e corrija somente documentação/testes
ou problemas reais encontrados, sem criar uma API paralela.
