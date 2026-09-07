# Prompt para evolução da API AzData — busca empresarial unificada

Use este prompt no repositório `azdata/api`. A API continua sendo dona do contrato HTTP; não altere ETL nem o B-Atlas nesta tarefa.

---

Implemente uma busca empresarial unificada no módulo Receita Federal/CNPJ da API AzData, preservando os endpoints atuais.

## Objetivo de produto

O consumidor não diferencia “empresa” de “estabelecimento” ao iniciar uma busca. Ele informa uma única expressão, que pode ser razão social, nome fantasia, CNPJ básico ou CNPJ completo. A API deve resolver essa intenção de forma consistente e paginável, sem obrigar o frontend a encadear buscas diferentes.

## Novo endpoint

`GET /api/v1/receita-federal/cnpj/busca/`

Parâmetros:

- `q`: obrigatório, texto não vazio.
- `page`: inteiro positivo, padrão 1.
- `page_size`: somente 10, 25 ou 50; padrão 10.
- `include_total`: booleano opcional, padrão false.
- Filtros opcionais: `uf`, `municipio`, `cnae`, `situacao_cadastral`, `matriz_filial`, `porte` e `natureza_juridica`.

Semântica de `q`:

1. Remova apenas a pontuação usual de CNPJ para detectar documentos.
2. Com 14 dígitos, pesquise `cnpj` exato.
3. Com 8 dígitos, pesquise `cnpj_basico` exato, preservando zeros à esquerda.
4. Se o valor contiver somente dígitos em outro comprimento, responda 400 com erro associado ao campo `q`.
5. Nos demais casos, pesquise razão social OU nome fantasia em uma única consulta lógica, sem priorizar um campo e omitir resultados do outro.
6. A busca textual deve ser case-insensitive. Não adicione busca aproximada ou sem acentos sem suporte e testes explícitos.
7. Elimine duplicidades quando o mesmo registro corresponder nos dois campos.

Cada resultado deve representar um estabelecimento e retornar:

```json
{
  "id": 1,
  "cnpj": "00123456000199",
  "cnpj_basico": "00123456",
  "razao_social": "EMPRESA EXEMPLO LTDA",
  "nome_fantasia": "EXEMPLO",
  "identificador_matriz_filial": { "codigo": "1", "descricao": "Matriz" },
  "situacao_cadastral": { "codigo": "2", "descricao": "Ativa" },
  "uf": "SP",
  "municipio": { "codigo": 1234, "descricao": "São Paulo", "uf": "SP" },
  "cnae_principal": { "codigo": "6201501", "descricao": "Desenvolvimento de programas de computador sob encomenda" },
  "match_fields": ["razao_social"]
}
```

`match_fields` pode conter `cnpj`, `cnpj_basico`, `razao_social` e/ou `nome_fantasia`. Ele serve para a UI explicar a correspondência sem reproduzir regras de busca.

Use a paginação sem contagem já adotada pela API quando `include_total=false`. Quando `include_total=true`, use a paginação contada existente. Não calcule total por padrão.

Defina uma ordenação determinística e documentada, adequada à paginação. Para texto, priorize correspondências exatas, depois início e depois ocorrência interna; use CNPJ como desempate estável. Se essa relevância não for viável na primeira entrega, use uma ordenação estável e documente a limitação.

## Agrupamento por empresa

A experiência principal navega de Busca → Empresa → Estabelecimento. Como `busca/` pagina estabelecimentos, o frontend não deve agrupar somente a página recebida: uma empresa pode aparecer em outras páginas e o tamanho aparente da página ficaria inconsistente.

Para uma listagem inicial realmente agrupada, publique uma projeção paginada por `cnpj_basico`, aplicando relevância e paginação depois do agrupamento. Ela pode ser exposta por `GET busca/empresas/` ou por uma variante explicitamente documentada de `busca/`. Cada item deve trazer ao menos `cnpj_basico`, `razao_social`, total de estabelecimentos correspondentes e uma amostra/resumo de localidades e atividades. Não altere silenciosamente o formato atual baseado em estabelecimentos.

## Faceta de localidades da consulta completa

A listagem é paginada, portanto o frontend não consegue derivar todas as localidades possíveis a partir da página visível. Implemente um endpoint de agregação específico:

`GET /api/v1/receita-federal/cnpj/busca/facetas/localidades/`

O endpoint deve aplicar exatamente a mesma resolução de `q` da busca unificada e considerar o conjunto completo de registros correspondentes, não somente uma página. Ele deve aceitar `q` e os demais filtros ativos, exceto `uf` e `municipio`, para que esses dois campos sejam apresentados como opções da própria faceta.

Parâmetros adicionais:

- `descricao`: busca opcional pelo nome do município dentro da faceta.
- `page`: inteiro positivo, padrão 1.
- `page_size`: 25, 50 ou 100; padrão 50.

Resposta paginada e contada:

```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "uf": "SP",
      "municipio": {
        "codigo": 7107,
        "descricao": "Santana de Parnaíba",
        "uf": "SP"
      },
      "estabelecimentos_count": 12
    }
  ]
}
```

Requisitos:

- Agrupe pelo código canônico de município da Receita Federal e UF.
- Ordene por UF, descrição e código para garantir paginação estável.
- Preserve localidades desconhecidas em um grupo explícito com `municipio: null`, se houver registros assim; ausência de município não deve ser descartada silenciosamente.
- `estabelecimentos_count` representa a quantidade no conjunto completo da consulta antes da aplicação de `uf`/`municipio`.
- Evite materializar ou transferir todos os estabelecimentos para produzir a faceta; faça a agregação no banco e documente o plano/índices relevantes.
- Garanta que aplicar uma opção retornada como `uf` + `municipio` ao endpoint `busca/` produza resultados compatíveis com a contagem informada.

O contrato será consumido pelo B-Atlas por um botão discreto junto ao cabeçalho da coluna “Localidade”. Esse botão abrirá um popover em desktop e poderá usar dialog em telas estreitas. A seleção deve filtrar a consulta no servidor, voltar para a página 1, permanecer na URL e poder ser removida sem alterar o termo principal. Não crie um seletor permanente acima da tabela.

## Domínios para filtros selecionáveis

Não obrigue o frontend a manter códigos ou permitir digitação livre. Implemente endpoints oficiais de domínio:

- `GET dominios/situacoes-cadastrais/`
- `GET dominios/matriz-filial/`
- `GET dominios/portes/`
- `GET dominios/naturezas-juridicas/`

Cada item deve usar `{ "codigo": "string", "descricao": "string" }`. Preserve códigos como strings. Aplique a paginação contada padrão dos domínios, inclusive quando o conjunto atual for pequeno. `naturezas-juridicas/` deve aceitar `descricao` e `descricao_modo`; os demais podem começar sem busca textual se o conjunto couber em uma página.

Os endpoints existentes de CNAEs e municípios permanecem canônicos. Município continua usando código da Receita Federal, não IBGE, e deve poder ser filtrado por UF.

### Hierarquia CNAE para apresentação

O resultado atual publica somente o CNAE principal no nível de subclasse, com código de sete dígitos e descrição. Para que consumidores apresentem uma área econômica mais ampla sem manter faixas e rótulos duplicados no frontend, evolua o contrato com a hierarquia oficial:

```json
{
  "codigo": "8640205",
  "descricao": "Serviços de diagnóstico por imagem com uso de radiação ionizante, exceto tomografia",
  "secao": { "codigo": "Q", "descricao": "Saúde humana e serviços sociais" },
  "divisao": { "codigo": "86", "descricao": "Atividades de atenção à saúde humana" },
  "grupo": { "codigo": "864", "descricao": "Atividades de serviços de complementação diagnóstica e terapêutica" },
  "classe": { "codigo": "86402", "descricao": "Atividades de serviços de complementação diagnóstica e terapêutica" }
}
```

Preserve `codigo` e `descricao` atuais para compatibilidade. A fonte e a versão da estrutura CNAE devem ser as mesmas usadas pela API; não peça ao frontend que derive seções por intervalos numéricos. Quando essa hierarquia estiver disponível, o B-Atlas poderá priorizar `secao.descricao` ou `divisao.descricao` na tabela e manter a subclasse completa no detalhe.

## Erros e compatibilidade

- Mantenha barra final nas rotas.
- Não exija autenticação se os endpoints CNPJ atuais permanecem públicos.
- Retorne erros 400 por campo no formato já normalizado pela API.
- Não altere as rotas existentes nem seus formatos de resposta.
- Não consulte diretamente a Receita Federal e não execute ETL durante requisições.
- Não invente coordenadas. Geolocalização será um contrato posterior, baseado em fonte/crosswalk confiável e cobertura mensurável.

## Testes de aceite

Cubra: CNPJ básico e completo com zeros à esquerda; CNPJ mascarado; comprimento inválido; razão social; nome fantasia; termo presente nos dois campos sem duplicação; combinação de filtros; paginação estável; `count=null`; total solicitado; resultados vazios; faceta calculada sobre todas as páginas; contagens da faceta compatíveis com a busca filtrada; município nulo; domínios paginados; códigos desconhecidos; cancelamento/timeout conforme a infraestrutura existente; ausência de regressão nos endpoints atuais.

Ao concluir, informe rotas, serializers/views/services alterados, consultas e índices usados, testes executados e eventuais limitações de relevância ou desempenho.
