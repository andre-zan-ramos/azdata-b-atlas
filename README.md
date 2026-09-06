# B-Atlas · Business Atlas

SPA React para exploração de empresas e estabelecimentos da Receita Federal por meio da API AzData.

## Executar

Node 22.14 ou superior e npm. Na raiz:

```sh
npm ci
npm run dev
```

Acesse http://127.0.0.1:5176. Porta fixa; se ocupada, o Vite informa o conflito.
No PowerShell com scripts bloqueados, use `npm.cmd` no lugar de `npm`.

No Windows, após instalar as dependências, você também pode abrir `servers.bat`
com dois cliques ou executar `.\servers.bat`. Ele inicia apenas o frontend e abre
o navegador, usando a mesma configuração de `npm run dev`. Funciona mesmo quando
chamado de outra pasta. Argumentos adicionais são repassados ao Vite, por exemplo
`.\servers.bat --port 5177`. Não instala dependências nem exige arquivo `.env`.

O shell funciona sem `.env`. Ao conectar a API, copie `.env.example` para
`.env.local`, configure `VITE_AZDATA_API_BASE_URL` somente com a origem HTTP(S), sem `/api/v1`, e
reinicie o Vite. Variáveis `VITE_*` são públicas e incorporadas ao build.

```sh
npm run test:run
npm run typecheck
npm run build
npm run preview
```

`npm test` mantém os testes em watch. O build sai em `dist/`; preview usa 4176.
Na hospedagem estática, encaminhe rotas de página desconhecidas para `index.html`
para permitir acesso direto às rotas da SPA. A API separada deve autorizar a
origem do frontend via CORS quando necessário. Não há proxy nem backend local.

## Organização e evolução

- `src/app`: rotas, shell e provider de consultas.
- `src/pages`: início e página não encontrada.
- `src/api`: Axios centralizado e normalização de erros.
- `src/api/receita-federal/cnpj`: contrato tipado e cliente dos endpoints CNPJ.
- `src/components`: estados de consulta, paginação e seletores de domínio.
- `src/test`: configuração de testes; cenários junto ao código.
- `src/styles.css`: CSS simples e variáveis visuais básicas.

Leia [o guia de evolução](docs/arquitetura-e-evolucao.md) antes de ampliar a base.
Polling é referência de tecnologias; os arquivos deste projeto são independentes.
