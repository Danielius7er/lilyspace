# Decap CMS (antigo) — Guia corrigido: Netlify Identity mas sem conseguir fazer sign in

> Objetivo: resolver o problema MAIS comum quando você ativa o **Netlify Identity** e os emails chegam, mas a pessoa **não consegue entrar (login falha)**.
>
> Este guia é para uma pessoa que **não sabe programação**.

---

## 1) O que está provavelmente a acontecer (explicado simples)

Quando a Netlify envia o e-mail para criar/entrar na conta, o login pode falhar por 1 destes motivos:

1. **O endereço de e-mail não foi verificado** (ou a conta não ficou ativada).
2. **Você está a tentar fazer login na hora errada** (password/login vs link de “magic”/verificação).
3. **O fluxo de Identity está mal configurado** no Netlify (settings incompletas).
4. **O domínio não está certo** no Decap CMS (o `site_url` do painel precisa bater com o seu domínio real).

A seguir estão as correções na ordem mais provável.

---

## 2) Primeira correção (rápida): abrir o e-mail certo e terminar a ativação

1. Abra a caixa de entrada da usuária.
2. Abra o e-mail do Netlify Identity.
3. Procure pelo botão/link do tipo:
   - **Confirmar / Verify / Verify email**
   - **Sign in / Entrar**
4. Clique no link.

Se a pessoa **clicar no link**, isso muitas vezes resolve o problema sem precisar usar password.

> Importante: se você ignorar o e-mail de ativação e tentar logar direto com “email + password”, pode falhar.

---

## 3) Segunda correção (no Netlify): verificar Identity (settings essenciais)

No **Netlify**:

1. Abra o site.
2. Vá em **Settings → Identity**.
3. Verifique que está assim:
   - ✅ **Enable Identity** (ativado)
   - ✅ **Invite users** (ativado/usable)
   - ✅ **Confirm signup** (mantenha como padrão; se estiver “hard”, pode exigir verificação)

4. Procure por algo como **Email provider / SMTP** (se existir).
   - Se houver opções de provedor, use a configuração que você já tem em funcionamento.

---

## 4) Terceira correção: confirmar o `site_url` do painel (muito importante)

No seu projeto, o arquivo `public/admin/config.yml` tem:

- `site_url: https://exemplo.pt`

Isso tem de ser **o domínio real** onde o painel está aberto.

### O que fazer (sem programação)
1. Descubra seu domínio real (ex.: `https://minhaloja.com`).
2. Troque `site_url` para esse domínio.
3. Faça **redeploy/rebuild** no Netlify.

Se o `site_url` ficar errado, o login/fluxo do Identity pode quebrar.

> O ideal é deixar `site_url` exatamente igual ao domínio que você abre no navegador para ir ao `/admin`.

---

## 5) Quarta correção: como testar do jeito certo (checklist)

1. Abra o painel em:
   - `https://SEU_DOMINIO/admin`
2. Faça login usando:
   - **o link do e-mail** (se tiver)
   - ou “Sign in with email” (se a opção aparecer)
3. Depois de entrar, tente:
   - abrir a coleção de produtos
   - fazer uma alteração pequena e salvar

Se entrar e salvar, então o problema do “email/password” estava ligado ao fluxo (verificação/link).

---

## 6) Se ainda não funcionar: decisão prática sobre “substituir o Decap CMS”

Você escreveu que o Decap CMS está “arcaico” e que o login está dando dor.

### Melhor prática (recomendação inteligente)
Em vez de insistir no Decap CMS (antigo), o caminho moderno é substituir o painel por um CMS mais atual, com login e integração mais estáveis.

#### Como substituir sem stress
1. Escolher um CMS moderno (ex.: **Netlify CMS mais atual**, **Strapi**, **Directus**, **Sanity**, **Contentful**, etc.).
2. Conectar o painel ao seu site.
3. Migrar o conteúdo atual de `src/data/products.json`.
4. Garantir que fotos vão para `public/images` ou para um bucket/asset storage.

> Eu não vou te travar no código: a ideia é você ter um painel novo que funcione com login e permissões mais fáceis.

---

## 7) Plano de ação para você (sem programação)

### Etapa A — consertar login primeiro
1. Verificar se a pessoa concluiu o link de confirmação do e-mail.
2. Confirmar Identity no Netlify (Enable Identity + invite).
3. Ajustar `site_url` para o domínio real e redeploy.

### Etapa B — se continuar falhando
1. Trocar o Decap CMS por um painel mais moderno.
2. Manter a mesma lógica de produtos e imagens.

---

## 8) O que você precisa me dizer para eu ajustar o plano com precisão

Envie só isto (copiar/colar):
1. O erro exato que aparece no painel ao tentar sign in (mensagem completa).
2. O domínio real que você usa (ex.: `https://minhaloja.com`).
3. No Netlify → Identity, você ativou “Invite users” e o login está falhando mesmo após clicar no link do e-mail?

---

> Observação importante
> Este guia não mexe em código para você. A parte que envolve `site_url` exige atualizar a configuração e fazer redeploy (isso é do lado do projeto, mas é o passo mais comum quando login falha).

