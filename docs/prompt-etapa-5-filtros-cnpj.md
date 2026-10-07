# Prompt — Etapa 5: Validação final limitada

Implementar exclusivamente a Etapa 5 de `docs/contrato-depuracao-filtros-cnpj.md`.
Leia o contrato completo, `docs/entrega-etapa-2-cnae-geral.md`, os contratos
referenciados e a implementação/testes atuais. Etapas 1 a 4 estão implementadas;
preserve seus contratos. Não criar funcionalidades, filtros ou endpoints novos.

Revisar e completar somente lacunas relevantes da validação em Empresas e
Sócios no modo Mapa. Usar mocks/fixtures com tráfego operacional bloqueado.
Demonstrar zero chamadas empresariais na preparação, edição, diálogos e
recolhimento/reabertura de Demais consultas. Cobrir UF + CNAE, UF + período,
UF + CNAE + período e UF/município + CNAE nas duas áreas; intervalos abertos,
duas datas independentes, OR entre CNAEs e AND entre os demais filtros.

Preservar elegibilidade compartilhada, códigos literais, secundárias somente
com certificação API e IBGE auxiliar separado da Receita. URLs incompletas,
inválidas/repetidas e antigas sem revisão explícita não consultam. Não inserir
atividade, situação Ativa, datas ou território implícitos. Aplicar filtros é a
única ação que valida, escreve a URL, reinicia page=1 e consulta mapa/lista.

Verificar rascunho/aplicado, resumos recolhidos, submissão integral dos campos,
paginação que conserva edições pendentes, histórico, recarga e return_to.
Diálogos mantêm edição isolada, Confirmar/Cancelar/Limpar, foco, Tab/Shift+Tab,
Escape e retorno ao acionador; Enter não aplica consultas. Validar teclado e
larguras 375/1440 px. Limpar/Voltar ao Brasil cancela requisições e impede que
respostas tardias reapareçam. Preservar bloqueios de retry/refetch automático.

Conferir compatibilidade mapa/lista por release, filtros e contexto B2B,
identidades, duplicatas e registros sem coordenadas; erros não viram zero
resultados. Busca textual, detalhes e Obras conservam seus contratos.
Reutilizar os testes existentes; acrescentar somente provas de lacunas reais.
Executar suíte unitária serial (`node node_modules/vitest/vitest.mjs run
--maxWorkers=1`), suíte completa Chromium, build e checagem de whitespace.
Corrigir regressões comprovadas dentro desse escopo e registrar limites.

Atualizar de forma enxuta o contrato existente e preparar nele o plano manual
operacional posterior: recortes completos explícitos e limitados, paridade
mapa/lista e evidências necessárias. Revisar os executores existentes apenas
por leitura; não executá-los. Orçamento de chamadas, limites efetivos do
servidor, timeout/cancelamento e critério de latência precisam de definição
explícita antes de qualquer execução operacional. Não inventar esses valores.
Distinguir aceite funcional com fixtures do aceite operacional pendente.

Não executar API operacional, banco, benchmark, cargas ou executores de medição.
Não declarar desempenho PostgreSQL, cancelamento SQL ou aceite operacional da
Fase 6 com base em fixtures. Não ampliar o escopo para compensar evidências
operacionais ausentes. Se surgir dependência API nova, documentar primeiro;
não consumir parâmetro/endpoint inexistente. Não comitar nem sincronizar.
