# Prompt para a Azdata API — enriquecimento geográfico incremental CNO

Estamos trabalhando no repositório `C:\Users\andre\Documents\Projetos Python\Django+React\azdata\api`.

Antes de alterar arquivos, leia integralmente o contrato e a implementação atuais de CNO e CNPJ geolocation nos repositórios `azdata/api`, `repositorios_remotos` e `azdata/b-atlas`. Não execute migrations, SQL, cargas, chamadas ao provedor ou operações Git sem autorização explícita.

## Objetivo

Preparar e implementar a parte da Azdata API para enriquecimento geográfico incremental das ocorrências de obras CNO, preservando a propriedade do dado no produtor `repositorios_remotos`. A API deve continuar read-only em relação às tabelas do produtor e nunca geocodificar diretamente.

O B-Atlas já está preparado para um contrato aditivo e retrocompatível. Enquanto `geolocation` estiver ausente, ele mantém o comportamento atual. Quando o campo existir, ele solicitará uma única tentativa em lote para as ocorrências `not_requested`, fará um único refetch e exibirá apenas pontos `available` com precisão `postal_code_approximation`.

## Pré-requisito obrigatório

O produtor ainda não possui contrato canônico nem persistência CNO para geolocalização. Antes de fechar a implementação da API, publique um handoff para `repositorios_remotos` cobrindo:

- identidade durável sem FK para o `id` técnico recarregável;
- preservação literal de CNO, CEP, UF, código municipal TOM, código IBGE, release e endereço oficial;
- fingerprint do contexto cadastral;
- vínculo histórico/obsolescência quando release ou endereço mudar;
- reutilização segura de observações postais por `(provider, cep)` sem inferir que um CEP identifica uma obra;
- lease, idempotência, rate limit, retries operacionais e feature flags desabilitadas por padrão;
- validação de compatibilidade municipal/UF;
- nenhuma utilização de centroide municipal, TSE ou localidade censitária como ponto da obra.

Não crie tabelas gerenciadas na Azdata API para contornar esse pré-requisito.

## Contrato público esperado pelo B-Atlas

Cada item de `GET /api/v1/receita-federal/cno/obras/` e o detalhe de obra devem aceitar o campo aditivo:

```json
{
  "geolocation": {
    "status": "not_requested",
    "reason": null,
    "precision": null,
    "latitude": null,
    "longitude": null,
    "source": null,
    "observed_at": null,
    "stale": false
  }
}
```

Estados públicos: `not_requested`, `pending`, `available`, `unavailable`, `temporary_error`, `stale`, `disabled`.

Motivos controlados: `cep_missing`, `cep_invalid`, `not_found`, `no_coordinates`, `context_mismatch`, `load_in_progress`, `producer_unavailable`, `provider_unavailable`, `feature_disabled`.

Coordenadas só podem ser publicadas quando o vínculo ativo for compatível com o contexto atual e a precisão for `postal_code_approximation`. Para `stale` ou `context_mismatch`, publique coordenadas nulas.

## Operação em lote esperada

Implementar:

`POST /api/v1/receita-federal/cno/obras/geolocation/request/`

Corpo estritamente limitado a:

```json
{"occurrence_ids":[41,42]}
```

Regras:

- máximo de 50 IDs inteiros positivos, sem duplicatas;
- IDs servem apenas para selecionar ocorrências da release ativa; nunca são identidade persistente no produtor;
- rejeitar CNO, CEP, endereço, coordenadas, provider, release e campos adicionais enviados pelo navegador;
- resolver no servidor o contexto oficial completo de cada ocorrência;
- preservar a ordem da entrada e retornar um resultado por ID;
- não falhar o lote inteiro porque um item está indisponível;
- não realizar chamadas externas dentro de transação;
- não transformar o GET de obras em operação com efeitos colaterais;
- feature desabilitada por padrão;
- sem retry HTTP automático na API.

Resposta normalizada:

```json
{
  "results": [
    {
      "id": 41,
      "geolocation": {
        "status": "pending",
        "reason": null,
        "precision": null,
        "latitude": null,
        "longitude": null,
        "source": null,
        "observed_at": null,
        "stale": false
      }
    }
  ]
}
```

Preservar envelopes normalizados em HTTP `200`, `202`, `400`, `404`, `409`, `429` e `503`. Definir comportamento explícito para IDs que deixaram de pertencer à release ativa entre GET e POST.

## Segurança e operação

- API chama somente endpoint interno autenticado do produtor.
- Nenhuma chamada direta do navegador ou da API à BrasilAPI.
- Token apenas em header e nunca em logs/respostas.
- Timeout curto e configurável.
- Não habilitar flags de produção.
- GET cadastral permanece disponível se produtor/provedor estiver indisponível.
- Não criar polling; o consumidor fará refetch manual/controlado.

## Testes mínimos

- campo aditivo na lista e no detalhe;
- sete estados e todos os motivos controlados;
- preservação literal de CNO/CEP/códigos e zeros iniciais;
- lote vazio, duplicado, acima de 50, ID inválido e campo adicional;
- seleção por IDs somente na release ativa;
- nenhuma persistência direta pela API;
- produtor mockado, sem rede real;
- falha parcial do lote;
- timeout e envelopes `400/404/409/429/503` normalizados;
- `stale/context_mismatch` sem coordenadas;
- feature desabilitada por padrão;
- GET não aciona produtor nem provedor.

Ao final, documente o contrato entregue, variáveis de ambiente, dependência do produtor e pendências operacionais. Não faça commit ou push sem solicitação explícita.
