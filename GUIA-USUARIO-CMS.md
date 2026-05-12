# Guia para a Usuária: entrar no painel e publicar fotos/produtos

Este site usa **Decap CMS** para que a dona da loja consiga atualizar o catálogo **sem programar**.

> Observação: o painel está em `/admin` e está configurado para enviar imagens e dados para o catálogo.

---

## 1) Entrar no painel

1. Abra o navegador e aceda ao endereço do painel:
   - `https://SEU-DOMINIO/admin`
2. Faça login quando o site pedir.

### Como é o login
- O acesso é feito através do sistema de identidade do serviço de deploy (Identity).
- Depois de autenticar, o painel desbloqueia as opções de editar e enviar conteúdo.

---

## 2) Onde publicar (produtos)

No painel:

1. Procure a secção/coleção com o nome **“Produtos da Loja”**.
2. Abra a lista de produtos.

Você vai ver uma tabela/lista onde pode:
- criar um novo produto
- editar um produto existente
- alterar o estado do produto

---

## 3) Enviar/atualizar fotos (imagem)

Para cada produto existe o campo **“Foto”**.

1. No produto, encontre o campo **Foto**.
2. Clique em **Upload/Escolher imagem**.
3. Selecione a imagem no seu computador.
4. Confirme o upload.

A imagem será carregada e disponibilizada no catálogo do site.

> Dica: use imagens com boa luz e enquadramento (de preferência com o mesmo estilo das outras fotos) para o catálogo ficar consistente.

---

## 4) Publicar e controlar o “Estado” (disponível / esgotado)

Cada produto tem o campo **Estado**:
- **Disponível** (`disponivel`) → o produto aparece como comprável.
- **Esgotado** (`esgotado`) → o site mostra o produto como esgotado (ex.: selo) e não fica “comprável”.

Passos:
1. No produto, altere **Estado**.
2. Revise os dados (nome, preço, descrição e foto).

---

## 5) Rascunho vs Submeter (privilégios / workflow)

Este painel está configurado com **editorial workflow**.

Na prática, isso significa:
- Você pode **fazer alterações e submetê-las**.
- A publicação final pode depender de aprovação/validação do workflow (por exemplo, tu ou um administrador aprova).

Como você usa isso:
1. Faça as alterações (incluindo imagem e estado).
2. Procure o botão/ação de:
   - **Save/Salvar** (rascunho)
   - **Submit/Submeter** (para aprovação/publicação via workflow)
3. Quando estiver submetido, aguarde a aprovação.

---

## 6) Como ver no site

Depois de a alteração entrar no estado publicado:
1. Abra a página do catálogo (home).
2. Verifique:
   - se a foto aparece
   - se o preço/nome/descrição estão corretos
   - se o estado mudou (disponível vs esgotado)

---

## Checklist rápido (para não esquecer)

- [ ] Nome do produto correto
- [ ] Preço correto
- [ ] Descrição correta
- [ ] **Foto** carregada (upload concluído)
- [ ] **Estado** correto (disponivel/esgotado)
- [ ] Salvar / Submeter (conforme o que o painel indicar)

