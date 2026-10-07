# CNAE/CONCLA no fluxo de atividade — Fase 6

Atualização de 07/10/2026: [Etapa 2 — CNAE geral](entrega-etapa-2-cnae-geral.md)
substitui o campo manual pelo diálogo Receita. A consulta IBGE descrita abaixo
foi preservada dentro desse diálogo; seleção altera sua edição interna e só
Confirmar transfere ao rascunho externo. A descrição abaixo registra a entrega anterior.

06/10/2026. Base B-Atlas `a969cf0`, API `5952cef`, OpenAPI CNAE `1.0.0`.
Os dois checkouts estavam limpos; as entregas anteriores foram reutilizadas.
Implementação somente no B-Atlas. Revisão, commit e sincronização autorizados
pelo usuário após a entrega e validação da integração; resultado Git informado
no fechamento. A implementação inicial foi preparada sem commit/push.

## Uso e separação de domínios

Empresas e Sócios no modo Mapa reutilizam `CnpjB2BFilters`. O campo manual
`cnaes` agora recebe também a seleção assistida pelo botão **Consultar catálogo
oficial CNAE**. O botão abre uma consulta independente e lê apenas `catalogo/`.
Nós são consultados após **Consultar nós CNAE**, por código literal ou descrição
contendo, com nível e tamanho 10/25/50. O nível inicial é subclasse.
Não há download completo, consulta por tecla, detalhe por item ou expansão de prefixo.

O catálogo exibe versão, fingerprint, data, cobertura declarada e proveniência
integral. Contagens globais e `count` do recorte são apresentados separadamente.
NULL, vazios, espaços, arrays/células e duplicatas são preservados; o JSON literal
permite distinguir valores que uma apresentação textual comum tornaria ambíguos.
Descrições oficiais não substituem os valores de `CnaeRf` nas respostas CNPJ.
O catálogo IBGE não altera `b2b-v1` nem certifica a versão histórica da Receita.

Somente subclasses têm botão **Selecionar**. A ação acrescenta o código literal
ao rascunho, conservando tokens manuais, inclusive repetições e valores inválidos
para validação pela API. Não aplica mapa/lista. **Aplicar filtros** envia `cnaes`
e `atividade_escopo` pelos endpoints B2B existentes e reseta a página. Nenhum
nível, pai, versão ou publicação IBGE é enviado ao CNPJ. Código indisponível na
Receita conserva seleção/URL e mostra o erro da API, sem substituição silenciosa.
O campo permanece editável para revisar ou remover códigos.

Secundárias continuam dependendo exclusivamente de `secondary_available` do
catálogo editorial/API e da certificação da release. O catálogo IBGE não libera
a opção; nenhuma flag, dado raw ou relação normalizada foi alterada.

## Navegação, ocorrências e publicação

Detalhes e pais usam as referências explícitas retornadas, inclusive quando
prefixos divergem. Pai, filhos e relações seguem `links` do detalhe; coleções
permanecem paginadas fora dele. Relações são ocorrências, com linha/ID restritos
à publicação. Não há inferência por nome/código, deduplicação nem FK persistente.

Correspondências são uma consulta informativa por código de origem/destino e
resolução, com estados independentes `null`, `empty` e `present`. Campo vazio
sem filtro de estado significa ausência de filtro. Linhas completas mostram
versões, literais, células, membro, planilha, posição e destino, sem conversão.
`linked` oferece consulta do nó da FK. `absent_from_structure` e `no_target_code`
não criam links. `1822900`/`9609201` conservam `target=null`; `8430200` pode ser
consultado em nós e não recebe correspondência inventada quando o recorte é vazio.

O cliente cobre os cinco GETs, todos os filtros do OpenAPI e `AbortSignal`.
Serialização não remove strings vazias ou espaços. Paginação segue `next` e
`previous` completos, incluindo publicação/filtros, sem acumular páginas.
Links só consultam os paths CNAE permitidos na origem AzData configurada,
preservando a query da API; uma origem absoluta de link não muda o transporte.
Publicação divergente no envelope também é rejeitada como 409.

A identidade de consulta inclui sessão, versão, publicação e filtros/link.
Não há retries, polling ou refetch automático por foco/reconexão. Queries
inativas são removidas (`gcTime=0`), sem histórico de publicações. Ao receber
409, toda a apresentação antiga é ocultada, a sessão é cancelada e seu cache
é removido. **Reiniciar com a publicação atual** lê novos metadados e deixa a
navegação sem página/detalhe escolhido, até nova ação. Os códigos no rascunho
permanecem e a interface pede revisão. Fechar/alternar modo cancela consultas.
Erros 400/404/503, incluindo integridade, mostram `detail`; 503 não vira vazio.
O normalizador compartilhado reconhece `code` além do `codigo` predecessor.

## Harmonização e validação

A seleção aplicada segue a URL B2B existente e conserva recarga,
compartilhamento, retorno e histórico; filtros próprios de Mapa não migram
para Busca. A consulta auxiliar CNAE e sua página são transitórias: não entram
na URL CNPJ nem são persistidas. Escape fecha o painel e devolve foco ao botão;
navegação de consulta move foco ao título, estados anunciam carregamento/erro.
Enter nos campos do catálogo não submete o formulário cartográfico. JSON e
fingerprint quebram linha, ações se ajustam à largura do painel.

Foi corrigida a legenda antiga de Empresas que ainda negava o envelope de
release da lista contextual. A ressalva de ausência de snapshot entre GETs
permanece. Identidades dos seis fluxos, pontuação postal, registros sem
coordenadas, popups/alternativas e POST explícito CNO permanecem nos contratos.

Arquivos de implementação:

- `src/api/ibge/cnae/types.ts` e `client.ts`;
- `src/components/cnae-catalog-picker.tsx` e `cnae-catalog-results.tsx`;
- `src/components/cnpj-b2b-filters.tsx`, `src/api/errors.ts`, `src/styles.css`;
- legenda em `src/pages/establishments-page.tsx`.

Arquivos de testes/fixtures: `src/api/ibge/cnae/client.test.ts`,
`src/components/cnae-catalog-picker.test.tsx`, `src/test/cnae-fixtures.ts`,
`src/pages/establishments-page.test.tsx` e `src/pages/partner-map-mode.test.tsx`.
Documentação alterada: este arquivo, `fase-6-harmonizacao-validacao.md`,
`cnpj-filtros-b2b.md` e `contrato-modos-busca-mapa.md`.

Testes exercitam demanda/cancelamento, literais/duplicatas/JSON,
FKs sem prefixos, níveis não selecionáveis, next/previous, troca 409/reinício,
resoluções e divergências, ausência de cascata, erro Receita, URL/histórico,
compatibilidade B2B e bloqueio de secundárias.

Validação final: **239 testes em 25 arquivos aprovados**, com
`node node_modules/vitest/vitest.mjs run --maxWorkers=1`, além de
`npm run build`, UTF-8/mojibake nos 17 arquivos e `git diff --check`.
Há 18 testes do cliente e 15 do painel CNAE; os dois fluxos cartográficos
também exercitam a seleção oficial. Resultado registrado em
`fase-6-harmonizacao-validacao.md`. Primeira execução focada: duas asserções
de teste foram corrigidas (fixture de classe apontava para si e teste de foco
verificava título depois de clicar em Aplicar). Implementação não foi alterada
para acomodá-las. O build detectou um tipo amplo de nível na fixture de destino;
foi restringido a `subclasse`, conforme OpenAPI. As verificações finais passaram.

`agent-browser` não foi encontrado no PATH e não há ferramenta de navegador
exposta. Testes DOM/mocks não equivalem a navegador real. Aceite visual das
seis telas em 1440/375 px, teclado/popups, territórios, rolagem, recarga e retorno
segue pendente. Nenhum servidor operacional, HTTP/banco, carga, migration,
medição ou executor manual foi acionado. Não há evidência nova de desempenho.
Os perfis anteriores pararam em COUNT; integração CNAE não comprova solução
dos timeouts. Snapshot CNAE em um GET não certifica snapshot CNPJ nem entre GETs.

**Fase 6: integração frontend e validação automatizada entregues; aceite
integral continua pendente de navegador real e desempenho operacional.**
