# Prompt — Etapa 4: Demais consultas e harmonização

Implementar exclusivamente a Etapa 4 de `docs/contrato-depuracao-filtros-cnpj.md`
em Empresas e Sócios no modo Mapa. Leia o contrato completo, a entrega CNAE
`docs/entrega-etapa-2-cnae-geral.md` e a implementação atual antes de editar.
Etapas 1 a 3 estão implementadas; preserve seus contratos e regressões.

Implementar uma seção recolhível **Demais consultas** nas áreas existentes,
agrupando Selecionar CNAEs, Definir período e demais filtros empresariais.
Localidade e Aplicar filtros permanecem no painel. Não criar nova área no cabeçalho.
Mesmo recolhida, a seção deve exibir resumo das escolhas aplicadas e indicador
de alterações ainda não aplicadas; diferenciar claramente aplicado e rascunho.
Recolher/reabrir não limpa valores nem remove filtros da submissão.

Harmonizar Empresas/Sócios com campos compactos, rótulos claros, checkboxes com
estilo próprio e acessibilidade em 375/1440 px. Reutilizar componentes/padrões
existentes; limitar CSS ao escopo necessário. Sem controles duplicados ou rótulos
de legado. Diálogos CNAE/temporal mantêm foco inicial, contenção de foco, Escape,
retorno ao acionador e Confirmar/Cancelar/Limpar com edição interna isolada.

Preservar elegibilidade compartilhada: UF válida + CNAE e/ou limite temporal
válido, município opcional validado na UF e todos os parâmetros presentes válidos.
Não inserir CNAE, situação Ativa, datas, município ou outros filtros implícitos.
CNAEs conservam OR; território/períodos/demais filtros conservam AND.
Secundárias dependem da certificação API; IBGE continua auxiliar separado da Receita.
URLs antigas exigem revisão explícita, sem conversão silenciosa.

Somente Aplicar filtros valida o conjunto, atualiza URL, reinicia page=1 e
consulta mapa/lista com filtros idênticos. Abrir/recolher a seção, editar campos,
Enter nos diálogos e confirmar não aplicam consultas. Paginação usa somente o
recorte aplicado e conserva rascunho. Histórico/recarga/return_to preservados.
Limpar filtros/Voltar ao Brasil cancela requisições, remove o aplicado e oculta
respostas tardias. Preservar bloqueios de retry/refetch, domínios auxiliares,
release, contexto B2B, códigos literais, identidades, duplicatas e registros
sem coordenadas. Busca textual, detalhes e Obras conservam seus contratos.

Validar nas duas áreas com mocks e fixtures: zero chamadas empresariais em
preparação, recolhimento/reabertura e edição; valores mantidos quando recolhida;
submissão de todos os filtros mesmo recolhidos; resumo aplicado versus pendente;
paginação, histórico, recarga, erros e limpeza com respostas tardias; regressões
das Etapas 1/2/3, inclusive URLs inválidas/repetidas e secundárias indisponíveis.
Executar testes pertinentes, suíte completa Chromium e build. Bloquear tráfego
operacional no navegador; não executar API operacional, banco, benchmark,
cargas ou executores de medição. Fixtures não comprovam desempenho operacional.

Não implementar funcionalidades novas fora da Etapa 4, criar parâmetros/endpoints
API nem declarar concluídos a Etapa 5 ou o aceite operacional da Fase 6.
Se surgir dependência API nova, documentar e entregar API/OpenAPI antes de consumir.
Atualizar documentação de forma enxuta no contrato existente, conservando apenas
artefatos úteis; informar resultados e limitações. Não comitar nem sincronizar.
