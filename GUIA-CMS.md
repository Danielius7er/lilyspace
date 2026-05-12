# Gestão da loja sem programar (Painel Admin)

Implementei um painel visual com **Decap CMS** em `/admin` para gerir produtos e fotos sem tocar em código.

## O que a dona da loja pode fazer

- Alterar preço
- Alterar nome e descrição
- Marcar produto como **disponível** ou **esgotado**
- Adicionar novos produtos
- Remover produtos
- Fazer upload de novas imagens
- Colocar produto em **Kits** ou **Catálogo**

## Como usar localmente (antes do deploy)

1. No terminal da pasta do projeto:

   - `pnpm install`
   - `pnpm cms:proxy`

2. Abrir outro terminal e correr:

   - `pnpm dev`

3. Abrir no navegador:

   - `http://localhost:4321/admin`

> O `cms:proxy` simula o backend Git para edição local.

## Como usar em produção (sem programar)

No deploy (recomendado Netlify):

1. Ativar **Identity** no painel do Netlify
2. Ativar **Git Gateway**
3. Convidar a dona da loja por email (Identity > Invite users)
4. Ela entra em `https://teu-dominio/admin`

Pronto: ela passa a gerir o catálogo num painel visual.

## Campo "Esgotado"

No painel, em cada produto, usar campo **Estado**:

- `disponivel` -> mostra botão WhatsApp
- `esgotado` -> mostra selo "Esgotado" e desativa compra

## Ficheiros criados/alterados para isso

- `public/admin/index.html`
- `public/admin/config.yml`
- `src/data/products.json` (estrutura com chave `products`)
- `src/components/ProductCard.astro` (estado esgotado)
- `src/components/WhatsAppButton.astro` (botão desativável)
