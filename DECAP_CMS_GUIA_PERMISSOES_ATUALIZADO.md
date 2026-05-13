# Decap CMS (antigo) — Guia simples para dar acesso PERFEITO e mais seguro a quem não programa

> Objetivo: permitir que alguém que **não sabe programar** consiga entrar no painel **/admin** e editar produtos/fotos sem você ter que ficar “mexendo em código”.
>
> Este guia foca em **permissões e acesso** (login + capacidade de editar/pedir aprovação), e em como manter tudo organizado.

---

## 1) Entenda o seu ponto atual (por que pode ser confuso)

O seu painel usa **Decap CMS** com `backend: git-gateway` e `publish_mode: editorial_workflow`.

Isso significa, na prática:
- A usuária precisa fazer **login**.
- Ao editar, a alteração pode **ficar aguardando aprovação** (editorial workflow).
- Para a edição funcionar, o CMS precisa conseguir **escrever** no repositório via Git Gateway.

---

## 2) Melhor prática recomendada (para quem não programa)

Você deve usar um fluxo que tenha:
- **Login fácil** (convite por email)
- **Acesso controlado** (quem edita vs quem aprova)
- **Processo claro** (escreveu → revisa → publica)

O fluxo mais comum e mais simples para este tipo de setup é:

### ✅ Netlify (recomendado)
- Netlify Identity (convites por email)
- Git Gateway do Netlify (liga o CMS ao seu repositório)

Se o seu deploy for Netlify, siga a seção **3**.
Se for Render, pule para a seção **4**.

---

## 3) Como dar acesso no Netlify (sem mexer em código)

### 3.1 Ativar Identity (login)
1. No Netlify, abra o seu site.
2. Vá em **Settings → Identity**.
3. Ative **Enable Identity**.
4. Ative **Invite users**.

### 3.2 Convidar a usuária (a dona da loja)
1. Ainda em **Identity**, clique em **Invite users**.
2. Coloque o email dela.
3. Envie o convite.
4. Ela recebe email, cria/ativa conta e fica pronta para login no painel.

### 3.3 Ativar Git Gateway (permitir edição)
1. Vá em **Settings** procure por **Access control / Git Gateway**.
2. Ative **Git Gateway**.
3. Confirme o branch como **`main`**.

> Atenção: seu `public/admin/config.yml` já está com:
> - `backend: git-gateway`
> - `branch: main`
>
> Ou seja, o Netlify Git Gateway precisa estar alinhado.

### 3.4 Separar “editar” de “aprovar” (editorial workflow)
Como o seu CMS está em `publish_mode: editorial_workflow`, o comportamento ideal é:
- Usuária (dona) **submete** alterações
- Você (admin) **aprova** quando estiver ok

Para isso:
- No Netlify Identity, mantenha permissões adequadas para que a usuária consiga **submeter**.
- Você deverá ter permissão para **aprovar/publicar**.

> Se você não sabe quais roles colocar, a forma mais segura é:
> - Conceder acesso de edição limitada à usuária.
> - Garantir que você mantenha controle de publicação.

### 3.5 Teste rápido (checklist)
1. Abra: `https://SEU-DOMINIO/admin`
2. Faça login com a conta convidada.
3. Edite um produto (nome/preço).
4. Suba uma imagem em **Foto**.
5. Verifique se:
   - aparece “enviado/submetido” (workflow)
   - e se depois você aprova e publica

---

## 4) Se o deploy for Render (importante)

O erro “Decap CMS arcaico” costuma aparecer porque:
- O Render **não tem Netlify Identity/Git Gateway** nativo.
- Então o `git-gateway` pode falhar dependendo de como o ambiente tem acesso ao Git.

### O que fazer no Render (sem dor)
Você tem duas opções:

#### Opção A (mais simples): continuar com Netlify
Se sua prioridade é “dona da loja editar sem programar”, mantenha o fluxo Netlify (se possível).

#### Opção B: trocar o backend do CMS
Se você quer usar Render mesmo assim, precisa ajustar o CMS para um backend que funcione no Render (ex.: destino direto para GitHub/um backend compatível).

> Essa opção exige mexer em `public/admin/config.yml` e ajustar permissões do repositório.
> Como você pediu algo mais simples, a recomendação prática é: **preferir Netlify**.

---

## 5) Checklist de segurança (para não dar acesso demais)

Quando alguém não sabe programar, é fácil “liberar demais”. Faça assim:

- ✅ A usuária deve ter acesso para **submeter alterações**
- ✅ Evite dar acesso de **merge/push livre** sem aprovação
- ✅ Use `editorial_workflow` para manter qualidade
- ✅ Deixe só você como aprovador

---

## 6) Onde a usuária edita (seu caso)

Seu CMS edita:
- `src/data/products.json`

E upload de imagem vai para:
- `public/images`

Ou seja, a usuária só precisa:
- entrar em `/admin`
- editar os campos
- enviar imagem

---

## 7) Se o problema for “login não funciona” ou “não salva”

Sinais comuns:
- O painel carrega mas não loga
- A usuária loga mas as alterações não aparecem
- Upload falha

A correção quase sempre é uma destas:
- Identity não está ativado
- Git Gateway não está ativado
- branch do Git Gateway não é `main`
- `site_url` no CMS não bate com o domínio do deploy

> Dica rápida: no seu `public/admin/config.yml` existe:
> - `site_url: https://exemplo.pt`
>
> Troque para o domínio real do site e faça rebuild/deploy.

---

## 8) Próximo passo para você (sem programação)

1. Confirmar se o deploy é **Netlify** ou **Render**.
2. Se for Netlify, seguir a seção 3.
3. Fazer o teste rápido (seção 3.5).
4. Se der erro, me envie:
   - qual plataforma (Netlify/Render)
   - qual etapa falha (login? salvar? upload?)
   - e a mensagem de erro exata

---

> Observação: este guia foi feito para uma usuária que não programa. O “trabalho chato” fica por conta de permissões/ativação no painel do provedor (Netlify/Render).

