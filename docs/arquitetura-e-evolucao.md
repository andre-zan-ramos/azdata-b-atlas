# B-Atlas: decisões e evolução gradual

## Orientação para as próximas tarefas

Começar pequeno. Implementar somente a funcionalidade solicitada. O Polling serve
como referência de React consumindo API, não como template nem fonte de domínio.
Não alterar os checkouts Polling, API ou ETL sem autorização para a tarefa.
Este guia orienta decisões; não é uma lista de implementações pendentes obrigatórias.

## Fundação atual

- React 18, TypeScript estrito e Vite, preservando a abordagem conhecida.
- React Router em modo declarativo: shell com Outlet, início e 404. Sem framework SSR.
- Axios centraliza configuração, timeout e erros; aceita `signal` nas requisições.
- TanStack Query instalado e provider ativo conforme o requisito de infraestrutura.
  Nenhuma consulta fictícia foi acrescentada para exercitá-lo na interface.
- Um minuto de staleTime; no máximo uma repetição para erros de rede/5xx normalizados.
  Sem repetição automática de 4xx, cancelamentos, falhas de configuração ou mutations.
- Vitest 3 e Testing Library para testes básicos, compatíveis com Vite 6.
- CSS único pequeno, fontes do sistema e algumas variáveis. Sem design system.
- Imports relativos. EditorConfig basta inicialmente; lint, formatter e aliases
  podem entrar quando o volume ou a colaboração justificar seu custo.
- Sem mapas, gráficos, tabelas avançadas, Radix, Lucide ou estado global extra.
  Bibliotecas conhecidas não são instaladas sem componente consumidor.

## Como integrar a primeira consulta

Confirmar primeiro o contrato HTTP real. Não inventar endpoints ou formatos de
paginação. Criar o serviço e os tipos ao implementar a funcionalidade aprovada.
Usar `apiClient.get<T>(caminhoRelativo, { params, signal })` e retornar `response.data`.
No `queryFn`, encaminhar o `signal` recebido do TanStack Query ao serviço.
Não converter cancelamento em erro visível. Exibir loading, erro/repetir e vazio
na região que consulta os dados, somente quando houver uma consulta real.

A URL base é validada no primeiro acesso: ausência de configuração não impede a
apresentação inicial, mas bloqueia consultas. Não há fallback para localhost.
O cliente normaliza mensagens textuais `detalhe`, `detail` ou `message`; validação
por campo, autenticação e outros envelopes serão adicionados conforme o contrato.
Usar caminhos relativos de endpoints internos; suporte a links absolutos de
paginação exigirá validação explícita de origem antes de ser introduzido.

## Quando ampliar a estrutura

| Necessidade observada | Evolução proporcional |
| --- | --- |
| Primeira tela de domínio com serviço e tipos próprios | Criar uma pasta em `features/` e mover seu código relacionado para ela |
| Componente utilizado em mais de uma tela | Extrair para `components/`; criar `shared/` apenas se melhorar a organização real |
| Shell ou navegação crescerem | Separar o shell de `app.tsx`; rotas continuam centralizadas |
| Filtros que precisam ser compartilhados | Representar filtros na URL; manter estado efêmero local |
| Listas grandes | Busca/paginação no servidor conforme contrato; não carregar toda a base no navegador |
| Segundo modal ou seletor complexo | Avaliar Radix e extrair uma primitiva acessível |
| CSS ficar difícil de localizar | Separar estilos por componente/página e consolidar tokens repetidos |
| Mais contribuidores ou inconsistência recorrente | Configurar lint de React/hooks e formatter |
| Primeira integração completa | Testar o fluxo no navegador com API real e casos de falha |
| Necessidade concreta de autenticação | Definir contrato de sessão com o backend antes de adicionar providers/guards |

Não criar pastas vazias, hooks genéricos de CRUD, tabelas universais ou pacotes
compartilhados entre produtos por antecipação. Uma pequena duplicação pode ser
mais barata que coordenar duas aplicações com requisitos ainda diferentes.

## Cuidados de domínio para o futuro

CNPJ e identificadores devem preservar zeros e formato contratual; não inferir
relações por nome. CNAE empresarial e estatísticas agregadas de outras fontes
não são intercambiáveis. Essas são orientações, sem implementação nesta fase.

## Verificação por mudança

Rodar testes relevantes e `npm run build`. Para alterações visuais, verificar
desktop/mobile e teclado. Manter este documento atualizado quando uma decisão
mudar, sem transformar intenções futuras em arquitetura obrigatória.

Referências consultadas para a fundação:
- https://reactrouter.com/start/declarative/installation
- https://tanstack.com/query/v5/docs/framework/react/guides/query-cancellation
