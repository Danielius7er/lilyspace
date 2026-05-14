# Substituir o Decap CMS (arcaico) — novo plano para painel moderno (sem dores)

## Objetivo
Ter um painel **em português**, com:
- login que funciona
- permissões corretas
- edição simples (sem programação)
- upload de imagens sem confusão

## Situação atual
O Decap CMS está falhando no fluxo de **Netlify Identity** (ex.: `invite_token` e não cria sessão), mesmo após ajustes básicos.

## Princípio
Em vez de tentar “consertar” um CMS antigo, vamos **trocar por um CMS moderno** que já tenha:
- login/usuários bem suportados
- integração limpa com o deploy
- editor mais estável

---

## Opção recomendada (melhor equilíbrio)
### 1) Retirar Decap e criar um painel com **Netlify + um serviço de CMS mais moderno**
Sugestões comuns:
- **Directus** (muito bom para imagens e permissões)
- **Strapi** (bom e flexível)
- **Sanity** (bem polido)

### Por que esta opção funciona bem para você
- controla permissões por usuário
- dá para limitar “quem edita” vs “quem aprova/publíca”
- a usuária consegue editar sem tocar em código

---

## Opção alternativa (mais rápida, menos infra)
### 2) Usar um painel gerador estático + admin do provedor (se disponível)
- Alguns provedores já oferecem painel com upload e login
- Exige menos manutenção do que rodar um backend completo

---

## Como será a migração do seu conteúdo
### Conteúdo atual (o que existe hoje)
- `src/data/products.json` (lista de produtos)
- imagens em `public/images/`

### Migração
- importar os produtos para a estrutura do CMS novo
- garantir que a URL das imagens continue a servir no site

---

## Requisitos que preciso confirmar (para não errar)
1. Você quer que a dona da loja:
   - (A) publique sozinha, ou
   - (B) submeta para você aprovar (workflow)
2. Você quer manter a estrutura de produtos como está (mesmos campos)?
3. Você prefere:
   - (A) rodar um backend (Directus/Strapi), ou
   - (B) usar um serviço gerenciado (menos técnico)

---

## Próximos passos (ordem prática)
1. Escolher o CMS novo (1 opção)
2. Criar o projeto do CMS
3. Definir permissões (edição vs aprovação)
4. Migrar `products` + imagens
5. Substituir o frontend para ler do novo formato
6. Deploy no Netlify
7. Teste com a usuária (edição + upload)

---

> Nota
> Este arquivo é um “novo plano” preparado para substituir o Decap CMS quando o problema for realmente compatibilidade/fluxo antigo com Identity.

