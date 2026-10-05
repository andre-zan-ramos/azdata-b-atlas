# Contrato de evolução — modos Busca e Mapa

Status: proposta consolidada para implementação faseada
Escopo: B-Atlas, AzData API e contratos necessários de geolocalização
Data: 2026-09-30

Evolução CNPJ B2B em 2026-10-05: `cnpj-filtros-b2b.md` documenta segmentos
explícitos, escopo de atividade, dois intervalos independentes e alternativa
contextual Empresas. Não há filtro mínimo obrigatório novo enquanto a política
permanece pendente. Preservar identidades, universo e limites de snapshot;
esta evolução não encerra as pendências da Fase 6.

## 1. Objetivo

As três áreas principais do B-Atlas — **Empresas**, **Sócios** e **Obras** — passam a oferecer dois modos de visualização dentro da própria área:

- **Busca**: pesquisa textual ou por identificador, seguida de resultados navegáveis;
- **Mapa**: exploração territorial, filtros geográficos, pontos geolocalizados e resultados correspondentes ao recorte do mapa.

O modo não cria uma quarta área no menu principal. `Vínculos` é uma coleção técnica associada a uma obra CNO e não possui a mesma hierarquia de Empresas, Sócios e Obras. Portanto, não deve aparecer como atalho ao lado do título de Obras nem como item principal. Os vínculos continuam acessíveis no detalhe da obra e por navegação contextual quando necessário.

## 2. Decisões de produto

### 2.1 Navegação

O cabeçalho global continua com:

`Início | Empresas | Sócios | Obras`

Dentro de cada uma das três áreas haverá um seletor de modo visível e consistente:

`Busca | Mapa`

- O item global identifica a área; o seletor identifica o modo dentro dela.
- A troca de modo não deve misturar estados incompatíveis. Cada modo conserva seus próprios parâmetros na URL quando o usuário alterna durante a mesma navegação.
- Links de detalhe preservam `return_to`, incluindo o modo, os filtros e a página de origem.
- URLs antigas de `/receita-federal/cno/vinculos` não devem quebrar: serão redirecionadas para Obras ou para o contexto de uma obra quando houver CNO identificável.

### 2.2 Modo Busca

O modo Busca é a entrada padrão das três áreas e mantém o padrão compacto já usado por Empresas e Sócios.

| Área | Entrada principal | Resultado principal |
| --- | --- | --- |
| Empresas | razão social, nome fantasia ou CNPJ | estabelecimentos/empresas correspondentes |
| Sócios | nome da pessoa ou empresa sócia | sócios agrupados, com suas participações |
| Obras | CNO ou responsável | ocorrências de obras CNO |

Para Obras, “responsável” significa apenas informação efetivamente publicada pela fonte: `ni_responsavel` e, quando o contrato da API o permitir, `nome_empresarial`. Não será inferido nome de pessoa, identidade civil ou relacionamento inexistente. O CNO, os documentos, os códigos e seus zeros à esquerda permanecem valores textuais literais.

O campo unificado de Obras deve:

- reconhecer CNO conforme regra explícita da API;
- pesquisar responsável por NI e por nome empresarial, sem confundir o campo oficial `nome` da obra com nome de responsável;
- oferecer modos de correspondência textual somente para campos em que a API os suporte de forma indexada e documentada;
- paginar no servidor e nunca filtrar apenas a página já carregada no navegador;
- preservar duplicatas e ocorrências distintas da fonte.

### 2.3 Modo Mapa

O modo Mapa não é uma busca textual com um mapa decorativo. Sua intenção principal é explorar **onde** estão os registros.

O padrão comum será:

- filtros territoriais à esquerda ou acima, conforme a largura disponível;
- mapa e resumo dos resultados na área principal;
- seleção de UF e município tanto pelos controles quanto pelo mapa;
- pontos somente para coordenadas válidas e com precisão declarada;
- tabela/lista de resultados vinculada ao mesmo conjunto e aos mesmos filtros do mapa;
- aviso explícito quando registros sem coordenadas existirem;
- estados de carregamento, vazio, erro, indisponibilidade e resultado truncado;
- navegação por teclado e alternativa textual ao conteúdo cartográfico.

O mapa não pode representar apenas os itens da página corrente como se fossem o universo do recorte. A API deverá fornecer um contrato cartográfico próprio ou metadados suficientes para declarar limites, paginação/amostragem e cobertura. Resultados sem coordenadas continuam na lista, mas não viram pontos artificiais.

Somente geolocalizações `available`, não obsoletas, sem `context_mismatch` e com precisão `postal_code_approximation` podem gerar pontos. Centroide municipal, geometria do IBGE, TSE ou outra referência territorial não pode ser apresentada como coordenada de empresa ou obra.

### 2.4 Semântica por área no mapa

#### Empresas

- Cada ponto representa um **estabelecimento**, pois é ele que possui endereço e CNPJ completo.
- O popup/hover mostra, no mínimo, nome fantasia ou razão social, CNPJ e município/UF.
- O clique abre o detalhe do estabelecimento preservando o retorno ao mapa.
- Filtros empresariais podem refinar o recorte, mas a localização é o eixo principal.

#### Sócios

- Não existe “coordenada do sócio” neste contrato.
- Cada ponto continua representando um **estabelecimento** de empresa da qual o sócio participa.
- O nome do sócio aparece no hover/popup e nos resultados como contexto da participação; nunca como titular da coordenada.
- Um estabelecimento pode corresponder a mais de um sócio e um sócio a mais de um estabelecimento. A API deve preservar essas relações sem deduplicar identidades de forma semântica.
- O clique deve permitir navegar para o sócio e para o estabelecimento/empresa correspondente.
- Documentos mascarados não comprovam identidade civil única; o agrupamento mantém a mesma ressalva do modo Busca.

#### Obras

- Cada ponto representa uma ocorrência de obra CNO com geolocalização válida.
- O popup/hover mostra CNO, nome da obra ou nome empresarial disponível, município/UF e a indicação “Localização aproximada pelo CEP”.
- O clique abre o detalhe da ocorrência, não uma entidade CNO deduplicada.
- Os filtros territoriais, datas e demais filtros já existentes permanecem no modo Mapa.
- A busca compacta por CNO/responsável pertence ao modo Busca, não ao formulário territorial do mapa.

## 3. Estado de URL proposto

O modo deve ser endereçável e compartilhável. Contrato preferencial:

- `/receita-federal/cnpj?modo=busca`
- `/receita-federal/cnpj?modo=mapa`
- `/receita-federal/cnpj/socios?modo=busca`
- `/receita-federal/cnpj/socios?modo=mapa`
- `/receita-federal/cno?modo=busca`
- `/receita-federal/cno?modo=mapa`

`modo=busca` é o padrão quando o parâmetro estiver ausente. Valores desconhecidos são substituídos por `busca` com navegação `replace`, sem tela quebrada. Filtros, paginação e viewport devem usar chaves documentadas; não se deve reutilizar uma chave com semânticas diferentes entre modos.

## 4. Contratos de API necessários

Antes de implementar cada consumidor, o contrato correspondente deve ser publicado na AzData API e coberto por testes.

### 4.1 Busca de Obras

O endpoint de obras precisa aceitar uma intenção de busca unificada, preferencialmente `q`, com regra inequívoca para:

- CNO literal;
- NI do responsável literal;
- nome empresarial do responsável, quando disponível na fonte;
- modos textuais documentados (`q_modo`) apenas onde aplicáveis.

A resposta deve informar em quais campos houve correspondência, para que o frontend não replique regras do servidor. A ordenação deve ser determinística. Os filtros atuais de UF, município TOM, datas, situação, CNAE e CNO vinculado continuam independentes e combináveis.

### 4.2 Consulta cartográfica

Empresas, Sócios e Obras precisam de consultas cartográficas que retornem, no mínimo:

- identidade literal do registro representado pelo ponto;
- latitude, longitude, precisão, status, motivo, origem, data de observação e indicador de obsolescência;
- dados mínimos de popup;
- filtros efetivamente aplicados;
- indicação de cobertura, limite e truncamento;
- resultados/lista compatíveis com o mesmo recorte territorial.

O recorte deve aceitar UF/município e, se for adotado viewport, limites geográficos validados. Limites de quantidade, agregação e clusters devem ser explícitos; não podem ocorrer amostragem ou descarte silenciosos.

Para Sócios, cada item cartográfico deve declarar separadamente:

- o estabelecimento geolocalizado;
- a empresa relacionada;
- o sócio ou grupo de sócio exibido;
- a participação que fundamenta a relação.

A consulta de Sócios não deve multiplicar chamadas de detalhe por ponto nem montar o universo juntando páginas no navegador.

### 4.3 Solicitação de geolocalização

- GETs permanecem sem efeitos colaterais.
- Solicitações de enriquecimento são POST explícitos, limitados e idempotentes do ponto de vista do consumidor.
- Não haverá polling nem retry automático.
- Falha de enriquecimento não remove o registro oficial dos resultados.
- O produtor é dono da persistência e da identidade de contexto; o B-Atlas é consumidor.

## 5. Fases de implementação

Cada fase abaixo deve ser executada em uma thread separada. Uma fase só começa quando seus contratos predecessores estiverem aprovados e disponíveis.

### Fase 1 — Fundação de navegação e modos

Escopo no B-Atlas:

- criar o seletor acessível `Busca | Mapa` compartilhado;
- estabelecer `modo` na URL e preservar `return_to`;
- deixar Busca como padrão nas três áreas;
- retirar “Pesquisar vínculos” do cabeçalho de Obras;
- manter compatibilidade por redirecionamento da rota antiga de vínculos;
- separar os componentes atuais de Obras sem ainda alterar seu comportamento: busca compacta será preparada e a experiência territorial atual ficará no modo Mapa.

Aceite:

- menu global contém apenas Início, Empresas, Sócios e Obras;
- as seis combinações área/modo são endereçáveis;
- histórico, recarregamento, links e retorno de detalhes preservam o estado;
- nenhuma chamada nova de geolocalização é introduzida.

### Fase 2 — Contrato e modo Busca de Obras

Escopo na AzData API e, após publicação, no B-Atlas:

- publicar e testar a busca unificada de Obras por CNO/responsável;
- implementar a barra compacta alinhada a Empresas e Sócios;
- apresentar resultados em tabela paginada e navegável;
- manter filtros avançados somente se fizerem sentido no modo Busca, sem duplicar o formulário territorial.

Aceite:

- CNO e documentos com zeros à esquerda são preservados;
- nome empresarial não é confundido com `nome` da obra;
- paginação, cancelamento, erros de campo, URL e `count: null` funcionam;
- nenhum filtro client-side sobre uma única página simula suporte inexistente da API.

### Fase 3 — Modo Mapa de Obras

Escopo:

- mover e lapidar a experiência territorial atual para `modo=mapa`;
- consumir o contrato cartográfico de Obras;
- sincronizar filtros, mapa e lista/tabela;
- preservar o fluxo controlado de geolocalização já contratado.

Aceite:

- pontos representam ocorrências, e não CNOs inferidamente únicos;
- mapa não se limita silenciosamente à página visível;
- obras sem coordenadas continuam listadas;
- TOM é usado no filtro CNO e IBGE apenas em estados/geometrias e na ponte territorial publicada;
- cliques no mapa aplicam a consulta imediatamente.

### Fase 4 — Modo Mapa de Empresas

Escopo:

- publicar/consumir a consulta cartográfica de estabelecimentos;
- reutilizar o padrão territorial e visual validado em Obras;
- integrar filtros empresariais relevantes e navegação ao detalhe.

Aceite:

- cada ponto identifica inequivocamente um estabelecimento/CNPJ completo;
- popup e resultado vêm da mesma consulta/recorte;
- coordenadas inválidas, obsoletas ou fora do contrato não são plotadas;
- falha de geolocalização não oculta a empresa da lista.

### Fase 5 — Modo Mapa de Sócios

Escopo:

- publicar/consumir a consulta cartográfica de participações por estabelecimento;
- exibir nomes de sócios nos pontos e resultados sem atribuir coordenada ao sócio;
- permitir navegação contextual para sócio e estabelecimento/empresa.

Aceite:

- o mapa deixa claro que a localização pertence ao estabelecimento;
- múltiplos sócios/participações no mesmo local são representados sem perda silenciosa;
- agrupamentos e documentos mascarados conservam as ressalvas de identidade;
- não há cascata de requisições por detalhe nem junção incompleta no cliente.

### Fase 6 — Harmonização e validação integral

Escopo:

- uniformizar responsividade, estados vazios/erro/carregamento e linguagem;
- revisar acessibilidade do seletor, filtros, popups e alternativa tabular;
- revisar acentuação/mojibake;
- testar navegação cruzada, retorno, URLs compartilháveis e telas estreitas;
- medir volume e desempenho dos contratos cartográficos.

Aceite:

- os três modos Busca têm comportamento visual coerente;
- os três modos Mapa têm a mesma gramática de interação sem apagar diferenças de domínio;
- mapa e alternativa textual expõem o mesmo recorte declarado;
- testes focados, suíte pertinente, build e verificação visual passam sem regressões.

## 6. Fora de escopo

- criar `Vínculos` como quarta área de negócio;
- atribuir coordenadas diretamente a sócios;
- inferir responsável, identidade civil, titularidade ou vínculo além da fonte;
- normalizar/deduplicar CNOs, documentos, códigos ou ocorrências oficiais;
- usar centroide municipal como se fosse endereço do registro;
- executar geocodificação automática por GET, polling ou retry silencioso;
- implementar todos os mapas apenas com dados da página atual;
- alterar produtor, banco, migrations ou cargas sem contrato e autorização próprios.

## 7. Questões deliberadamente fechadas por este contrato

- **“Vínculos” vai para o menu principal?** Não. Permanece informação contextual de Obras.
- **Obras terá Busca e Mapa?** Sim. Busca por CNO/responsável; Mapa para exploração territorial e demais filtros geográficos.
- **Empresas e Sócios também terão Mapa?** Sim, em fases próprias.
- **O ponto de Sócios representa o sócio?** Não. Representa o estabelecimento relacionado; o sócio aparece como contexto.
- **A página corrente basta para montar o mapa?** Não. É necessário contrato cartográfico explícito.
- **Registros sem geolocalização desaparecem?** Não. Permanecem nos resultados textuais com estado transparente.

## 8. Regra de mudança do contrato

Qualquer desvio de semântica — especialmente identidade do ponto, busca por responsável, agrupamento de sócios, limites cartográficos ou origem das coordenadas — exige atualização e aprovação deste documento antes da implementação. Ajustes puramente visuais que não mudem comportamento ou dados podem ser tratados dentro da fase correspondente.
