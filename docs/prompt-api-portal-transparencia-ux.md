# Prompt para a API — contrato do Portal da Transparência para a nova UX

Use este prompt no repositório `azdata/api`. O B-Atlas já consome estes três endpoints e eles devem continuar sendo a única interface HTTP do frontend:

- `GET /api/v1/portal-transparencia/pessoas-juridicas/{cnpj}/`
- `GET /api/v1/portal-transparencia/pessoas-juridicas/{cnpj}/recursos-recebidos/`
- `GET /api/v1/portal-transparencia/pessoas-juridicas/{cnpj}/contratos/`

Não crie rotas paralelas e não faça o frontend chamar diretamente o Portal da Transparência. Preserve barra final, paginação e os códigos públicos de erro existentes. A consulta deve continuar sob demanda: nenhum endpoint deve ser disparado automaticamente ao abrir a tela.

## Objetivo

Revise e, se necessário, ajuste os três contratos para sustentar uma única ação do usuário que busca todos os domínios, apresentados em três seções verticais. As chamadas são independentes e uma falha parcial não deve invalidar respostas bem-sucedidas das outras rotas.

## Semântica dos indicadores

A resposta atual de pessoa jurídica expõe booleanos com nomes técnicos (`favorecidoDespesas`, `possuiContratacao`, `convenios`, `favorecidoTransferencias`, `sancionadoCEPIM`, `sancionadoCEIS`, `sancionadoCNEP`, `sancionadoCEAF`, `participanteLicitacao`, `emitiuNFe`, `beneficiadoRenunciaFiscal`, `isentoImuneRenunciaFiscal` e `habilitadoRenunciaFiscal`). Verifique na documentação/implementação oficial o significado exato de cada campo.

Não invente interpretações. Proponha e implemente um contrato explícito e estável, preferencialmente mantendo o valor literal e acrescentando metadados como `label`, `description`, `value` e, quando aplicável, `source_scope`/`reference_date`. Se a semântica de algum indicador não puder ser comprovada, documente essa limitação em vez de inferi-la. Garanta compatibilidade transitória ou coordene a mudança tipada com o B-Atlas.

## Recursos recebidos

A experiência inicial não deve exigir datas. Faça a rota de recursos aceitar a ausência de `mes_ano_inicio` e `mes_ano_fim` e, nesse caso, devolver os 3 registros mais recentes disponíveis para o CNPJ, com ordenação determinística documentada. Datas continuam opcionais para filtragem explícita posterior.

O contrato atual foi verificado estaticamente e ainda não atende a essa experiência: `RecursosRecebidosQuerySerializer` exige as duas datas, a view aceita apenas `mes_ano_inicio`, `mes_ano_fim` e `pagina`, e o serviço apenas repassa esse intervalo ao upstream. A investigação existente também registrou que a ordem observada na resposta do Portal não era cronológica. Portanto, não limite os três primeiros itens da resposta atual e não transfira a ordenação para o frontend.

Interprete “3 mais recentes” como os três registros da empresa com maior referência temporal oficial disponível no payload (atualmente `anoMes`), independentemente de quando ocorreu o último recebimento. A API deve descobrir um intervalo que contenha dados, ordenar pela referência temporal de forma decrescente e aplicar o limite somente depois dessa ordenação. Defina um desempate estável para referências iguais e documente até onde a busca retrocede, para que ausência no intervalo pesquisado não seja apresentada como ausência histórica.

Confirme a restrição real de período do upstream. Se o Portal aceitar no máximo um mês por chamada, encapsule na API a estratégia mínima e segura necessária, sem expor essa limitação como formulário obrigatório no frontend e sem afirmar cobertura completa quando ela não puder ser garantida. Preserve códigos, zeros à esquerda, `null`, strings vazias, duplicidades e valores monetários exatamente como recebidos.

Inclua na resposta metadados suficientes para a UI distinguir: período efetivamente pesquisado, ordenação, página, quantidade retornada, `total_count` desconhecido e existência conhecida/desconhecida de próxima página. Não transforme `null` em zero ou `false`.

## Contratos e estruturas aninhadas

Mantenha a rota de contratos e revise se os objetos aninhados têm nomes e tipos estáveis para renderização tabular. Preserve estruturas oficiais e valores literais; não serialize objetos como texto e não infira relacionamentos. Documente campos opcionais e listas.

## Verificações e testes

Antes de alterar, inspecione as views, serializers, clientes do upstream, tipos e testes já existentes dessas três rotas. Adicione testes para:

- uso exclusivo dos três endpoints acima, sem rota nova nem chamada direta pelo frontend;
- ausência de consulta automática;
- indicadores booleanos com semântica comprovada e valores literais preservados;
- recursos sem datas retornando no máximo os 3 mais recentes em ordem determinística;
- filtro opcional por período e validação das limitações do upstream;
- falhas independentes por domínio e códigos públicos seguros;
- paginação com desconhecidos preservados como `null`;
- contratos com objetos/listas aninhados, strings vazias, zeros à esquerda e campos nulos.

Não faça chamadas produtivas ao Portal da Transparência durante a implementação ou os testes. Use mocks/fixtures já existentes. Ao concluir, informe o contrato final de cada rota, o significado comprovado de cada indicador, as limitações que permaneceram e o ajuste exato que o B-Atlas precisará fazer.
