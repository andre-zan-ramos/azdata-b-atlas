# B-Atlas · Business Atlas

SPA React para futura exploração de dados empresariais, com backend separado.
Fundação inicial: página de apresentação, roteamento e infraestrutura HTTP.
Não há endpoints de domínio, autenticação ou consultas automáticas à API.

## Executar

Node 22.14 ou superior e npm. Na raiz:

```sh
npm ci
npm run dev
```

Acesse http://127.0.0.1:5176. Porta fixa; se ocupada, o Vite informa o conflito.
No PowerShell com scripts bloqueados, use `npm.cmd` no lugar de `npm`.

O shell funciona sem `.env`. Ao conectar a API, copie `.env.example` para
`.env.local`, configure `VITE_API_BASE_URL` com uma URL HTTP(S) absoluta e
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
- `src/test`: configuração de testes; cenários junto ao código.
- `src/styles.css`: CSS simples e variáveis visuais básicas.

Leia [o guia de evolução](docs/arquitetura-e-evolucao.md) antes de ampliar a base.
Polling é referência de tecnologias; os arquivos deste projeto são independentes.
