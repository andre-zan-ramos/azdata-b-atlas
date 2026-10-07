# Prompt — Etapa 3: Período

Implementar exclusivamente a Etapa 3 — Período — de
`docs/contrato-depuracao-filtros-cnpj.md` no B-Atlas, em Empresas e Sócios no
modo Mapa.

Leia o contrato completo, `docs/entrega-etapa-2-cnae-geral.md` e inspecione a
implementação atual antes de editar. Etapas 1 e 2 já estão implementadas.
Preserve elegibilidade compartilhada, separação rascunho/aplicado, domínio
municipal independente, seletor CNAE Receita, consulta auxiliar IBGE, revisão
explícita de URLs antigas, certificação de secundárias, bloqueios de
queries/refetch, histórico, paginação e limpeza com cancelamento.

Implementar:

- Um diálogo temporal compartilhado, aberto por **Definir período**, substituindo
  os quatro campos de data externos nas duas áreas Mapa, sem controles duplicados.
- Dois grupos independentes que podem coexistir: **Início de atividade**
  (`inicio_atividade_de` / `inicio_atividade_ate`) e **Evento da situação cadastral**
  (`situacao_evento_de` / `situacao_evento_ate`). Cada grupo admite de, até ou ambos.
  Limites inclusivos, datas ISO na API e apresentação local brasileira.
- Edição interna isolada do rascunho externo. **Confirmar** valida os dois grupos
  e altera somente o rascunho externo; **Cancelar/Escape** descarta a edição
  interna; **Limpar** limpa somente a edição interna. Erros conservam as escolhas
  para correção. Enter, abertura, edição e confirmação não aplicam a consulta.
- Resumo externo com campo temporal e limites, inclusive intervalos abertos.
  Mostrar alterações ainda não aplicadas, inclusive durante paginação aplicada.
  Reabrir restaura o rascunho confirmado; histórico/recarregamento restauram o
  recorte da URL. Não inserir limites ou outro filtro implicitamente.
- Validação compartilhada de datas reais, formatos e limites invertidos.
  Ambos os grupos se combinam por AND; CNAEs conservam OR entre códigos e AND
  com território/período/demais filtros. Grupo sem limites não envia parâmetros
  e não satisfaz a regra de elegibilidade. UF válida + ao menos um limite temporal
  válido é elegível sem CNAE; município permanece opcional e validado na UF.
- Explicar no diálogo: evento cadastral não significa última atualização geral
  nem necessariamente abertura; datas ausentes não correspondem ao intervalo.
  Não apresentar esses campos como prova de empresas ativas em um período.
- Acessibilidade: título, foco inicial, contenção de Tab/Shift+Tab, retorno ao
  acionador, Escape e teclado. Verificar usabilidade em 375 e 1440 px. Reutilizar
  o padrão modal da Etapa 2 quando adequado, sem harmonização geral da aplicação.

Somente **Aplicar filtros** valida o recorte completo, atualiza a URL, reinicia
`page=1` e consulta mapa/lista com os mesmos filtros. Paginação usa exclusivamente
o recorte aplicado e conserva edições pendentes. Limpar filtros/Voltar ao Brasil
cancela requisições, remove o recorte aplicado e oculta respostas tardias.

Preservar compatibilidade mapa/lista, release, filtros, contexto B2B, códigos
literais com zeros iniciais, identidades, duplicatas e registros sem coordenadas.
Não inserir atividade, situação cadastral, datas ou município implícitos.
Busca textual, detalhes e Obras conservam seus contratos.

Não implementar a seção Demais consultas nem a harmonização geral da Etapa 4.
Não declarar concluída a Etapa 5 ou o aceite operacional da Fase 6. Não criar
endpoint/parâmetro API novo: os quatro parâmetros temporais existentes bastam;
se surgir dependência nova, documentar e entregar API/OpenAPI antes de consumir.

Validar com mocks/interceptação nas duas áreas:

- Zero requisições empresariais ao abrir vazio/incompleto, abrir o diálogo,
  editar datas, confirmar, cancelar, pressionar Enter ou limpar a edição.
- Cancelar/Escape conserva o rascunho anterior; Confirmar altera apenas o
  rascunho; Limpar + Cancelar conserva valores anteriores; Limpar + Confirmar
  remove somente os limites temporais do rascunho.
- UF + período sem CNAE, limites abertos, dois intervalos simultâneos, datas
  inválidas/invertidas e combinação com CNAEs/município/demais filtros.
- Aplicar elegível envia filtros idênticos para mapa/lista e reinicia a página;
  erro conserva valores; remover o último limite sem CNAE bloqueia o novo recorte.
- URLs completas/incompletas/inválidas/repetidas, histórico, recarga,
  `return_to`, paginação aplicada com alterações pendentes e cancelamento de
  respostas tardias após limpeza.
- Regressões das Etapas 1/2, incluindo seleção CNAE por páginas, IBGE auxiliar,
  URLs antigas e bloqueio de secundárias sem certificação.
- Navegador Chromium com fixtures, foco/teclado e 375/1440 px nas duas áreas.

Não executar buscas na API operacional, banco, benchmarks, cargas ou executores
de medição. Bloquear tráfego operacional nos testes de navegador. Execute os
testes pertinentes, a suíte de navegador e o build, atualize a documentação e
informe resultados e limitações. Não comitar nem sincronizar nesta execução.
