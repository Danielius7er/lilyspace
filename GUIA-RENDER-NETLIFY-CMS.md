# Guia para mim (Admin): habilitar login e o painel do CMS no Render ou Netlify

Este projeto usa **Decap CMS** (em `/admin`) com configuração em `public/admin/config.yml`.

- `backend: git-gateway` (branch `main`)
- `publish_mode: editorial_workflow`
- Upload de mídia: `media_folder: public/images` e `public_folder: /images`
- Coleção: **“Produtos da Loja”** → edita `src/data/products.json`

---

## 1) Primeiro: o que precisa estar correto no CMS (para o login funcionar)

No `public/admin/config.yml` o backend está como `git-gateway`. Isso normalmente funciona com:
- **Netlify Identity + Git Gateway** (fluxo mais simples)

Para o **login real** (quem pode editar), o comportamento depende de como o serviço de deploy (Netlify) fornece Identity e permissões.

> Importante: atualmente o `config.yml` não mostra explicitamente uma secção `identity:` — isso quer dizer que o fluxo exato pode depender do provider que você habilitar no serviço. Então o mais seguro é seguir a configuração padrão do **Netlify Identity + Git Gateway** para este tipo de setup.

---

## 2) Netlify (recomendado) — passo a passo

### A) Ativar Identity
1. No Netlify, entre no site.
2. Vá em **Settings → Identity**.
3. Ative **Enable Identity**.
4. Ative **Invite users**.

### B) Ativar Git Gateway
1. Ainda em **Settings**, encontre **Access Control / Git Gateway**.
2. Ative **Git Gateway**.
3. Confirme o **branch** como `main`.

### C) Convidar a Usuária (privilégios / roles na prática)
1. Em **Identity**, use **Invite users**.
2. Convidar a dona da loja por email.
3. Garanta que ela tem acesso suficiente para editar via Git Gateway.

No painel Decap CMS com `editorial_workflow`, o fluxo tende a ser:
- A usuária pode **submeter** alterações
- Uma aprovação/autorização define quando entra publicado

Se houver opção de **roles/permissions** no Netlify Identity ou nas regras do Git Gateway, configure para permitir acesso de edição/autoria conforme necessário.

### D) Verificar `site_url`
- No `public/admin/config.yml` existe:
  - `site_url: https://exemplo.pt`
- Troque para o seu domínio real **e faça rebuild/deploy**.

### E) Teste rápido
1. Abra `https://SEU-DOMINIO/admin`.
2. Faça login com a conta convidada.
3. Edite um produto e carregue uma imagem no campo **Foto**.
4. Verifique se o site atualiza quando o workflow concluir.

---

## 3) Render — como fazer funcionar (atenção)

O Render não tem **Netlify Identity + Git Gateway** nativo.

Com o `backend: git-gateway`, o objetivo é: o CMS conseguir fazer commits/push no repo (ou usar uma alternativa compatível).

Existem dois caminhos comuns:

### Caminho 1 (mais simples): manter o fluxo Git Gateway com um provedor compatível
- Usar um serviço que ofereça Identity compatível com o Decap CMS (ou um setup equivalente)
- Depois garantir que o CMS consegue escrever no `main`

Como o seu setup já está desenhado para Netlify (padrões Identity), se você quer usar Render **sem mexer no código**, normalmente é necessário:
- ou hospedar o backend/Identity num serviço compatível
- ou ajustar o `backend` no `config.yml` para outro backend suportado

### Caminho 2 (mais controlável): alterar o backend do Decap CMS para algo suportado no Render
- Você escolhe um backend de publicação diferente (ex.: diretamente para GitHub) e configura as permissões.
- Depois ajusta `public/admin/config.yml` para esse backend.

> Como o projeto está atualmente configurado apenas com `git-gateway`, e você pediu especificamente “no Render ou Netlify”, a recomendação prática é: 
> - Se for Netlify: siga o fluxo acima.
> - Se for Render: você provavelmente vai precisar **trocar o backend** ou usar um provedor de Identity alternativo.

### Checklist Render
1. Garanta que o site em produção aparece em `/admin`.
2. Garanta que o CMS consegue efetivamente publicar/commitar.
3. Confirme se o upload funciona para `public/images`.
4. Verifique o workflow: `editorial_workflow` pode exigir aprovação.

---

## 4) Como conferir que a Usuária tem “privilégios” corretos

Como o `publish_mode` está em `editorial_workflow`, a usuária precisa pelo menos de:
- Permissão para autenticar (login)
- Permissão para criar/editar e submeter alterações

A diferença entre “pode publicar sozinho” vs “precisa aprovação” depende do workflow e permissões do backend/provider.

Passos para validar:
1. Convidar/autorizar a conta da usuária.
2. Submeter uma alteração.
3. Verificar no repo/estado do workflow se a alteração foi:
   - publicada imediatamente
   - ou ficou aguardando aprovação

---

## 5) Onde a imagem vai parar

No CMS:
- Campo `imagem` (widget `image`) envia para:
  - `media_folder: public/images`

No JSON:
- O produto `imagem` passa a referenciar o caminho na pasta pública:
  - normalmente será servido como `/images/...`

---

## 6) Resumo rápido (o que eu faço)

### Se for Netlify
- Ativar Netlify Identity
- Ativar Git Gateway
- Convidar a usuária
- Atualizar `site_url` no `public/admin/config.yml`
- Fazer teste de login + upload de imagem + alteração de estado

### Se for Render
- Confirmar que o backend `git-gateway` funciona no contexto do Render (pode exigir ajustes)
- Se não funcionar, mudar o backend do Decap CMS para o provedor compatível e configurar permissões.
- Testar upload e o workflow.

