# Prompt para o B-Atlas — consumo dos endpoints CNPJ

Use este prompt no repositório `azdata/b-atlas`. A API Django `azdata/api` é a
dona dos contratos HTTP e o ETL `repositorios_remotos` é o dono das tabelas e
índices publicados. Não altere esses dois repositórios nesta tarefa.

## Objetivo

Revise e, somente se necessário, ajuste o consumo dos endpoints CNPJ já
implementados no B-Atlas. Existe uma implementação inicial da busca de sócios no
commit `01052fc`; evolua-a em vez de criar uma segunda página ou outro cliente.

Preserve a fundação pequena do projeto: React 18, TypeScript estrito, React
Router, Axios, TanStack Query e Vitest. Não copie o Polling, não adicione estado
global ou bibliotecas sem necessidade e não reproduza regras de busca da API no
frontend.

## Contratos canônicos

O prefixo é `/api/v1/receita-federal/cnpj/` e todas as rotas mantêm barra final.

### Busca empresarial

`GET busca/`

- `q` é obrigatório e pode representar razão social, nome fantasia, CNPJ básico
  de 8 dígitos ou CNPJ completo de 14 dígitos.
- Aceita `page`, `page_size=10|25|50`, `include_total` e os filtros `uf`,
  `municipio`, `cnae`, `situacao_cadastral`, `matriz_filial`, `porte` e
  `natureza_juridica`.
- Cada item representa um estabelecimento. Use `match_fields` apenas para
  explicar a correspondência; não refaça a resolução do termo no cliente.
- Faça uma única chamada a `cnpjApi.search`. Não encadeie buscas por razão
  social/nome fantasia e não faça merge, deduplicação ou reordenação local.

### Faceta de localidades

`GET busca/facetas/localidades/`

- A faceta é calculada pela API sobre a consulta completa, não sobre a página
  visível.
- Envie `q` e os demais filtros ativos, mas não envie `uf`, `municipio` nem
  `include_total`.
- Aceita `descricao`, `page` e `page_size=25|50|100`.
- `municipio` pode ser `null`; preserve esse grupo na interface.
- O controle deve permanecer junto ao cabeçalho “Localidade”, usando o padrão
  existente de popover em desktop e dialog em telas estreitas.
- Ao selecionar ou limpar uma localidade, atualize a URL e volte para `page=1`.

### Busca de sócios

`GET socios/`

- `q` é obrigatório, aparado pela API e deve possuir ao menos 3 caracteres.
- A busca é case-insensitive contendo sobre o nome ou razão social do sócio;
  não é uma busca por CPF/CNPJ e não promete equivalência sem acentos.
- Aceita `page`, `page_size=10|25|50` e `include_total`.
- Cada item é uma **participação societária**, não uma pessoa única. Homônimos e
  múltiplas participações devem permanecer como linhas distintas, identificadas
  pelo `id` da relação. Nunca agrupe ou deduplique pelo nome ou documento.
- CPF de pessoa física pode estar mascarado. Mostre-o apenas como dado da fonte;
  não crie pesquisa, link ou identidade baseada nele.
- Preserve `cnpj_basico`, documentos e códigos como strings, inclusive zeros à
  esquerda.

Formato de cada participação:

```json
{
  "id": 123,
  "identificador_socio": 2,
  "nome_socio_ou_razao_social": "MARIA DA SILVA",
  "cnpj_cpf_socio": "***123456**",
  "qualificacao_socio": { "codigo": "49", "descricao": "Sócio-Administrador" },
  "data_entrada_sociedade": "2020-01-02",
  "representante_legal_cpf": "",
  "representante_legal_nome": "",
  "faixa_etaria": 5,
  "empresa": {
    "cnpj_basico": "00123456",
    "razao_social": "EMPRESA EXEMPLO LTDA",
    "natureza_juridica": { "codigo": "2062", "descricao": "Sociedade Empresária Limitada" },
    "porte_empresa": { "codigo": "03", "descricao": "Empresa de Pequeno Porte" }
  }
}
```

`natureza_juridica`, `porte_empresa`, `qualificacao_socio`, datas, faixa etária
e dados de representante podem ser nulos ou vazios conforme a fonte.

### Detalhes e domínios

Preserve o fluxo Busca/Sócios → Empresa → Estabelecimento e o parâmetro local
`return_to` para retornar à consulta e página anteriores. Continue usando os
endpoints já tipados de empresas, estabelecimentos, CNAEs, municípios, situação
cadastral, matriz/filial, portes e naturezas jurídicas; não mantenha cópias
locais desses domínios.

## Paginação, URL e estados

- Trate corretamente tanto a resposta rápida, com `count: null`, `page`,
  `page_size`, `has_next` e `has_previous`, quanto a resposta contada solicitada
  por `include_total=true`.
- Não solicite total por padrão. A navegação deve funcionar apenas com os flags
  de anterior/próxima página.
- Mantenha `q`, filtros e página na URL. Uma nova busca ou mudança de filtro deve
  voltar à página 1.
- Use o `AbortSignal` fornecido pelo TanStack Query e inclua todos os parâmetros
  efetivos na `queryKey`.
- Diferencie estado inicial sem consulta, carregamento, resultado vazio, erro de
  validação por campo e erro geral. Não mostre “nenhum resultado” durante o
  carregamento.
- Exiba mensagens em português, mas preserve literalmente códigos/documentos
  recebidos da API.

## Revisão da implementação existente

Antes de editar, verifique `client.ts`, `types.ts`, `pagination.ts`,
`establishments-page.tsx`, `partners-page.tsx` e seus testes. Reuse
`cnpjApi.partners`, `PartnerSearchItem`, `adaptPage`, `Pagination`, `ApiError` e
os componentes de estado existentes. Remova apenas divergências comprovadas em
relação ao contrato acima.

Garanta especialmente que:

- `cnpjApi.partners` chame somente `socios/` e serialize apenas parâmetros
  definidos;
- a tabela de sócios use `item.id` como chave;
- duas linhas homônimas sejam renderizadas sem colapso;
- o link da linha use `empresa.cnpj_basico` sem convertê-lo em número;
- voltar do detalhe restaure termo, página e filtros da listagem;
- entradas com menos de 3 caracteres não gerem uma consulta inútil: valide na
  interface ou apresente corretamente o erro `400` associado a `q`, mantendo uma
  única fonte de verdade para a regra;
- mudanças na URL, inclusive voltar/avançar do navegador, mantenham o campo de
  busca coerente com o termo efetivamente consultado.

## Testes de aceite

Adicione ou ajuste testes para:

- cliente HTTP, prefixo, barra final, parâmetros e `AbortSignal`;
- busca empresarial com uma única chamada, filtros e faceta independente;
- página rápida com `count: null` e página contada;
- validação de `q`, carregamento, vazio, erro de campo e erro geral;
- dois homônimos com nomes iguais e `id`/empresas diferentes, ambos visíveis;
- CNPJ básico com zero à esquerda no texto e no link;
- campos aninhados opcionais e documento mascarado;
- paginação e restauração completa via URL/`return_to`;
- acessibilidade básica do formulário, tabela, mensagens e controles.

Execute `npm.cmd run typecheck`, `npm.cmd run test:run`, `npm.cmd run build` e
`git diff --check`. Não inicie servidores nem faça chamadas produtivas à API.
Ao concluir, informe divergências encontradas, arquivos alterados, testes
executados e qualquer limitação que dependa de novo contrato backend.
