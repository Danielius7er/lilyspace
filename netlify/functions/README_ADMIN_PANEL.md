# Painel Admin leve (sem Decap) — Netlify Functions

## O que é
Uma rota serverless que:
- valida uma senha (ADMIN_PANEL_PASSWORD)
- lista e salva `src/data/products.json`

## Configurar no Netlify
1. Netlify → Site settings
2. Environment variables
3. Adicione:
   - `ADMIN_PANEL_PASSWORD` = a senha que a dona/usuário vai usar no painel
   - `ADMIN_PANEL_TOKEN_SECRET` = segredo longo e aleatório para assinar sessões (obrigatório)

## Uso
- Abra o painel em `https://SEU_DOMINIO/admin`
- Entra com a senha
- Carrega/edita produtos e salva.

## Observação importante
Salva no arquivo dentro do ambiente de build/run do Netlify. Em projetos estáticos, para persistência garantida ao longo do tempo, o ideal é versionar via Git (mas como vocês querem “leve”, foi feito o caminho mínimo).

