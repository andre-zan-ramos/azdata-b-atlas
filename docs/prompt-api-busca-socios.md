# Prompt para a API — busca de sócios da Receita Federal

Implemente na API Django `azdata/api`, sem alterar o B-Atlas, um endpoint paginado para pesquisar relações societárias do CNPJ:

`GET /api/v1/receita-federal/cnpj/socios/`

O endpoint deve usar `SocioCnpj` como fato: cada resultado representa uma participação de um sócio em uma empresa. Aceite `q` obrigatório, remova espaços laterais e exija ao menos 3 caracteres. Pesquise `nome_socio_ou_razao_social` sem diferenciar maiúsculas/minúsculas. Em PostgreSQL, crie e use um índice apropriado para busca textual contendo (por exemplo, GIN com `gin_trgm_ops`) e verifique o plano; não entregue um `icontains` que resulte em varredura integral da tabela de sócios.

Contrato de resposta por item:

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

Use `FastPageNumberPagination`, com `page`, `page_size` (10, 25 ou 50), `include_total` opcional e a mesma envoltória de `busca/`. Ordene deterministicamente por `nome_socio_ou_razao_social`, `cnpj_basico` e `id`. Use `select_related` para empresa, qualificação, natureza jurídica e porte. Preserve códigos e documentos como strings.

Sobre CPF/CNPJ: os documentos de pessoa física vêm mascarados na base. Não prometa busca por CPF completo nem identificação unívoca. Se for útil suportar fragmentos, faça-o em um parâmetro separado `documento`, normalize somente os caracteres que a fonte realmente preserva, exija um mínimo seguro de dígitos e documente que a pesquisa pode ser ambígua. Antes de habilitá-la, compare custo e seletividade com busca exata/prefixada e adicione índice compatível; `q` deve continuar sendo busca por nome.

Adicione testes para validação de `q`, busca case-insensitive, paginação rápida com `count: null`, `include_total=true`, ordenação estável, empresa aninhada, preservação de zeros à esquerda, documentos mascarados e ausência de consultas N+1. Atualize `urls.py` e a documentação do contrato.
