# Infotech

Sistema de gestao de produtos, stock, vendas e financas para loja de informatica.

## Modulos principais

- Autenticacao de utilizadores por token JWT.
- Gestao de produtos com stock, preco, imagem e QR Code.
- Registo de vendas e movimentos de stock.
- Relatorios de stock em CSV.
- Resumo financeiro e exportacao de dados administrativos.

## Perfis de acesso

- `admin`: pode criar, editar e eliminar produtos, gerir utilizadores, consultar movimentos e aceder a financas.
- `atendente`: pode listar produtos e registar vendas, mas nao pode criar, editar ou eliminar produtos.
- `vendedor`: tem permissao equivalente ao atendente para listagem de produtos e vendas.

No backend, as rotas de criacao, atualizacao e eliminacao de produtos usam o middleware `apenasAdmin`.
No frontend, os botoes de editar e eliminar produtos aparecem apenas para administradores.

## Execucao

Instale as dependencias e inicie cliente e servidor:

```bash
npm install
npm run dev
```

Tambem e possivel executar separadamente:

```bash
npm run server
npm run client
```

## Variaveis de ambiente

Crie um arquivo `.env` local com as configuracoes necessarias, como `DATABASE_URL` e `JWT_SECRET`.
O `.env` nao deve ser enviado ao repositorio.

## Deploy no Render

O projeto pode ser publicado como dois servicos no Render.

Frontend como Static Site:

- Runtime: Static Site
- Build Command: `npm run build`
- Publish Directory: `dist`
- Variavel obrigatoria: `VITE_API_URL` apontando para a URL do backend com `/api`

Backend como Web Service:

- Runtime: Node
- Root Directory: `server`
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`
- Node: `20` definido em `.node-version` e em `package.json`

No backend, configure as variaveis `DATABASE_URL`, `JWT_SECRET` e `CLIENT_URL`.
