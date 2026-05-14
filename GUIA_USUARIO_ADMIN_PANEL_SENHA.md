# Guia do Admin (Painel por Senha) — Lili_space

Este painel substitui o antigo Decap CMS. Agora o acesso é feito por **senha** e permite **editar os produtos** (campos do seu `products.json`).

- Rota do painel: **`/admin`**
- API interna: **Netlify Function** `admin-products`
- Dados: **`src/data/products.json`**

> **Importante (por causa do seu caso):** na variável de ambiente do Netlify, a senha deve ser definida **exatamente como texto**, e eu recomendo SEM aspas.
> Ex.: `minhaSenha123` (sem aspas).

---

## 1) Preparação no Netlify

### 1.1 Definir a senha
1. No Netlify, abra o site.
2. Vá em **Site settings → Environment variables**.
3. Crie a variável:
   - **`ADMIN_PANEL_PASSWORD`** = (a sua senha)

Regras:
- Escreva a senha **sem aspas**.
- Não adicione espaços no começo/fim.

### 1.2 Redeploy
Depois de alterar as variáveis:
- faça **redeploy/rebuild** do site (para garantir que a Function e o build ficam sincronizados).

---

## 2) Como fazer login (eu e a cliente)

1. Abra no navegador: **`https://SEU_DOMINIO/admin`**
2. Preencha **“Senha do painel”**
3. Clique em **Entrar**

Se a senha estiver correta:
- o painel carrega a lista de produtos

---

## 3) Como editar

No painel, você pode:
- Carregar um produto na tabela (botão **Carregar**)
- Editar:
  - **ID**
  - **Categoria** (Catálogo / Kits)
  - **Nome**
  - **Preço**
  - **Descrição**
  - **Foto** (por URL)
  - **Estado** (Disponível / Esgotado)
  - **Video URL** (opcional)

### Dica da Foto (URL)
O painel espera uma URL no formato:
- **começando por** `/images/`

Exemplos:
- `/images/kit-azul-cetim-5000.jpeg`
- `/images/laco-unitario-1500.jpeg`

---

## 4) Como salvar

1. Clique em **Salvar**
2. Quando der “Salvo”, faça **redeploy/rebuild** no Netlify

Por que precisa redeploy?
- o painel salva no ambiente, mas o conteúdo do site estático é gerado no build.

---

## 5) Sair

Clique em **Sair** (limpa o token do navegador).

---

## 6) Erros comuns (rápidos)

### “Senha inválida”
- Conferir se `ADMIN_PANEL_PASSWORD` foi escrita **igual** (mesma capitalização, mesmos números)
- Conferir se não colocou espaços
- Confirmar que fez **redeploy** depois de alterar a variável

### “Salvou mas não apareceu no site”
- Isso é esperado até fazer **redeploy/rebuild**.

---

## 7) Referências técnicas
- Painel: `src/pages/admin/index.astro`
- Function API: `netlify/functions/admin-products.js`

