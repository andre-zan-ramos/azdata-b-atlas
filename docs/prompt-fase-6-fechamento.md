# Prompt — fechamento da Fase 6

Nota de 09/10/2026: Etapas 1 a 5 dos filtros CNPJ entregues; aceite operacional
continua pendente. O próximo trabalho é a
[preparação do aceite operacional CNPJ](prompt-preparacao-aceite-operacional-cnpj.md).
Esse prompt delimita a próxima thread; as instruções abaixo registram o fechamento anterior.
Leia também `docs/contrato-depuracao-filtros-cnpj.md`; não execute recortes CNPJ
incompletos nem use versões antigas dos controles como referência atual.

Quero concluir as pendências de aceite da Fase 6 — Harmonização e validação
integral — sem criar funcionalidades novas ou uma Fase 7.

Repositórios:

- B-Atlas: `C:\Users\andre\Documents\Projetos Python\Django+React\azdata\b-atlas`
- AzData API: `C:\Users\andre\Documents\Projetos Python\Django+React\azdata\api`

Leia integralmente:

- B-Atlas: `docs/contrato-modos-busca-mapa.md`,
  `docs/fase-6-harmonizacao-validacao.md`, `docs/testes-navegador.md`,
  `docs/cnae-ibge-frontend.md` e `docs/cnpj-filtros-b2b.md`.
- API: `docs/cnpj-mapas-investigacao-fase-6.md`,
  `docs/cnpj-filtros-b2b-implementacao.md`, `docs/cnpj-socios-mapa-contract.md`,
  `docs/cno-geolocation-contract.md` e `docs/cnae-ibge-api-handoff.md`.

Inspecione os worktrees e preserve mudanças alheias. Confirme os commits atuais;
o B-Atlas já contém harmonização Busca/Mapa, filtros B2B, catálogo oficial CNAE
e a suíte Playwright. O contrato vigente define somente Fases 1 a 6.

Estado conhecido:

- A implementação funcional da Fase 6 está entregue.
- A suíte curta tem 12 testes em Chromium real, um worker, sem retries e com
  API/IBGE/tiles interceptados. Ela verifica as seis telas em 1440/375 px,
  teclado dos mapas, seleção municipal, navegação CNO e paginação/falha de Sócios.
- Esses testes não comprovam integração operacional nem desempenho PostgreSQL.
- Perfis anteriores de Empresas/Sócios pararam em COUNT; não atribuir o gargalo
  à geolocalização sem nova evidência. Timeout HTTP não garante cancelamento SQL.

Trabalho desta thread:

1. Confronte o contrato com as evidências e apresente uma lista finita de
   verificações de aceite ainda necessárias. Separe ausência de implementação,
   validação isolada e aceitação operacional.
2. Complete somente as lacunas relevantes de navegador, com poucos cenários:
   painel CNAE aberto em 375 px, seleção preservada e reinício consciente após
   409; retorno de detalhe de Empresas/Sócios; estados vazio/indisponível/truncado
   quando não houver evidência suficiente. Não monte uma matriz combinatória.
3. Use Playwright/Chromium já configurado, um worker e fixtures locais para
   verificações de interface. Não substituir essas evidências por testes DOM
   nem apresentá-las como integração com a API real.
4. Prepare ou revise um plano operacional limitado para eu executar no VS Code:
   município explícito, filtros documentados, poucos pontos, uma requisição por
   endpoint, sem retries, sem paginação acumulada e com timeout no servidor e no
   cliente. Reutilize os executores existentes sempre que atenderem ao plano.
   Defina previamente o que medir e quais limites de latência serão avaliados;
   não inventar uma meta de produto como se já estivesse aprovada.
5. Analise os relatórios que eu fornecer. Não execute HTTP operacional, SQL,
   benchmarks, migrations, cargas, manutenção ou índices por mim. Sem dados
   novos, informe precisamente o que falta comprovar e finalize o trabalho
   independente de frontend que já estiver autorizado.
6. Se surgir incompatibilidade ou necessidade de otimização backend, documente
   o problema e prepare um handoff para uma thread própria da API. Não alterar
   o produtor, ampliar contratos ou reduzir silenciosamente o universo contado.
7. Atualize a matriz de aceite e rode as verificações proporcionais às mudanças:
   testes pertinentes, build, UTF-8/mojibake e diff --check. Não repetir suítes
   aprovadas sem mudança ou preocupação nova que justifique a repetição.

Preserve CNPJ/CNO, zeros iniciais, null/vazios, documentos mascarados, duplicatas
e identidades técnicas. Coordenadas pertencem ao estabelecimento ou à ocorrência
CNO, nunca ao sócio; somente geolocalização válida e compatível gera pontos.
Mapa e lista mantêm filtros/release/contexto contratados; igualdade de metadados
não garante snapshot transacional. Sem centroides, cascata por detalhe, polling,
geocodificação por GET ou POST automático.

Finalize com implementações verificadas, testes atuais, evidências operacionais
datadas e pendências objetivas. Declare aceite integral apenas se todos os
critérios obrigatórios estiverem comprovados. Não faça commit/push nesta nova
thread sem uma solicitação explícita.
