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

## Domínios para filtros selecionáveis

Não obrigue o frontend a manter códigos ou permitir digitação livre. Implemente endpoints oficiais de domínio:

- `GET dominios/situacoes-cadastrais/`
- `GET dominios/matriz-filial/`
- `GET dominios/portes/`
- `GET dominios/naturezas-juridicas/`

Cada item deve usar `{ "codigo": "string", "descricao": "string" }`. Preserve códigos como strings. Aplique a paginação contada padrão dos domínios, inclusive quando o conjunto atual for pequeno. `naturezas-juridicas/` deve aceitar `descricao` e `descricao_modo`; os demais podem começar sem busca textual se o conjunto couber em uma página.

Os endpoints existentes de CNAEs e municípios permanecem canônicos. Município continua usando código da Receita Federal, não IBGE, e deve poder ser filtrado por UF.

## Erros e compatibilidade

- Mantenha barra final nas rotas.
- Não exija autenticação se os endpoints CNPJ atuais permanecem públicos.
- Retorne erros 400 por campo no formato já normalizado pela API.
- Não altere as rotas existentes nem seus formatos de resposta.
- Não consulte diretamente a Receita Federal e não execute ETL durante requisições.
- Não invente coordenadas. Geolocalização será um contrato posterior, baseado em fonte/crosswalk confiável e cobertura mensurável.

## Testes de aceite

Cubra: CNPJ básico e completo com zeros à esquerda; CNPJ mascarado; comprimento inválido; razão social; nome fantasia; termo presente nos dois campos sem duplicação; combinação de filtros; paginação estável; `count=null`; total solicitado; resultados vazios; domínios paginados; códigos desconhecidos; cancelamento/timeout conforme a infraestrutura existente; ausência de regressão nos endpoints atuais.

Ao concluir, informe rotas, serializers/views/services alterados, consultas e índices usados, testes executados e eventuais limitações de relevância ou desempenho.
