# Tipo de estabelecimento — correção de 10/10/2026

Restaurantes, Academias, Lanchonetes e Bares eram exemplos. O campo principal
de Empresas e Sócios no modo Mapa agora usa o domínio Receita
`/api/v1/receita-federal/cnpj/dominios/cnaes/`, por meio do seletor múltiplo
existente. Busca remota por descrição, páginas de dez itens, códigos literais,
chips removíveis e limite de 100 escolhas permanecem.

O seletor foi movido de **Demais consultas** para **Tipo de estabelecimento**;
não há entrada CNAE duplicada. Alterações preservam o escopo escolhido e ficam
no rascunho. Aplicar envia `cnaes` e `atividade_escopo` para mapa/resultados.
O catálogo completo é navegável; não é enviado integralmente ao CNPJ.

`segmentos/` não fornece as opções principais. Continua atendendo capacidade
de secundárias e revisão explícita de URLs antigas. A consulta de revisão só
é habilitada por **Resolver segmentos da URL**. Desconhecidos, versões
divergentes e conflitos continuam exigindo correção consciente.

O contrato de filtros foi alinhado. A revisão da API está preparada em
`prompt-api-tipos-estabelecimento-cnae.md`: domínio geral, filtros fora dos
exemplos, documentação equivocada de segmentos, compatibilidade e limites.
Nenhum endpoint novo foi presumido pelo cliente.

## Evidências

- Suíte unitária serial: 310 testes aprovados em 30 arquivos. A rodada começou
  antes das duas adições concomitantes no teste de Empresas; a reexecução desse
  arquivo aprovou os 39 casos atuais. Build TypeScript/Vite aprovado.
- Checagem de whitespace dos arquivos deste trabalho aprovada. O checkout
  também contém edições concomitantes preservadas em arquivos de outra tarefa.
- Chromium focado: oito cenários aprovados, Empresas/Sócios em 375/1440 px;
  atividade fora dos segmentos, busca remota, paginação, seleção persistente,
  códigos com zeros, nenhuma consulta empresarial durante edição e envio
  coerente de mapa/resultados após Aplicar.
- Chromium amplo: 49 de 54 cenários aprovados. Cinco falhas fora do seletor
  CNAE: três exigem colunas de larguras iguais em 1366 px; uma seleciona todas
  as opções da página em vez de limitar ao listbox UF; outra espera `MG` no
  input que apresenta `Minas Gerais (MG)`. Traces e screenshots permanecem em
  `test-results/`; não foi alterado layout ou seletor UF neste trabalho.
- Testes unitários de integração do filtro usam o mesmo substituto do combobox
  utilizado pelos testes de página. Popup, busca, paginação e teclado reais
  são verificados em Chromium. As tentativas jsdom com o popup real não
  concluíram e foram encerradas; não contam como testes aprovados.

As fixtures verificam o cliente, não a completude da carga Receita nem o
desempenho operacional API/PostgreSQL. Não houve HTTP operacional, banco,
pipeline ou migração. O fechamento Git foi autorizado posteriormente.

Durante a validação surgiram alterações concomitantes em Empresas, seu teste,
estilos e contrato. Foram preservadas; o teste atual de Empresas foi
reexecutado e aprovou 39 casos. O build TypeScript/Vite atual também passou.
