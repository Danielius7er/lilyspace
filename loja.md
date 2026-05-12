# Vitrine digital — Loja (catálogo + WhatsApp)

## 1. Objetivo

Criar um **panfleto digital** (site estático) para uma loja local, com:

- Produtos com **foto, vídeo (quando existir), preço e descrição**
- Identidade simples (nome da loja, cores da marca)
- **Um clique em “Comprar”** abre o **WhatsApp** com mensagem já preenchida (nome do produto e preço)

**Público-alvo da manutenção:** a proprietária **não programa**. O MVP usa um ficheiro de dados editável com ajuda; a evolução prevê **painel visual (CMS)** para ela poder atualizar sozinha.

**Conceito:** JAMstack estático (SSG) — sem servidor nem base de dados — rápido e com custo de infraestrutura mínimo.

**Cores da marca:** rosa, roxo, branco (ajustar tons exatos no CSS/Tailwind).

---

## 2. Princípios

- **KISS** — sem backend desnecessário nem “mini e-commerce” completo
- **Mobile-first** — a maioria dos clientes abre no telemóvel
- **Conteúdo fora do repositório quando for pesado** — fotos/vídeos não devem “enterrar” o site em MB

---

## 3. Arquitetura (visão geral)

```text
[ Visitante (telemóvel / desktop) ]
        │
        ▼
[ Site estático HTML/CSS/JS (gerado no build) ]
        │
        ├── Dados dos produtos → ficheiro JSON (MVP) ou CMS (fase 2)
        │
        └── Mídia → pasta public (leve) ou URLs externas (recomendado para vídeo e fotos grandes)
        │
        ▼
[ Clique “Comprar” ]
        │
        ▼
[ WhatsApp (wa.me) ] — mensagem com produto e preço
```

**Não inclui:** carrinho persistente, pagamentos no site, servidor de API próprio.

---

## 4. Stack recomendada

| Camada | Escolha | Nota |
|--------|---------|------|
| Framework | **Astro** | Pouco ou zero JS no cliente por defeito; ideal para catálogo |
| Estilos | **Tailwind CSS** | Layout responsivo rápido |
| Dados (MVP) | `products.json` (ou nome equivalente) | Quem mantém o site edita o JSON com orientação, ou exporta de planilha |
| Dados (fase 2) | **Decap CMS** ou **Sanity** | A proprietária gere produtos num **painel web**, sem código |
| Mídia | **Cloudinary** / links diretos, ou fotos leves em `public/` | **Vídeo:** preferir **YouTube “Não listado”** ou Vimeo e incorporar link/embed — evitar dezenas de MB no projeto |

> **Porque não WordPress / BD pesado:** mais manutenção e superfície de ataque para o que é, na prática, um folheto online.

---

## 5. Estrutura de pastas (Astro)

```text
loja-vizinha/
├── public/
│   ├── videos/          # só se forem ficheiros pequenos; preferir embed YouTube/Vimeo
│   └── images/
├── src/
│   ├── components/
│   │   ├── ProductCard.astro
│   │   ├── Header.astro
│   │   └── WhatsAppButton.astro   # ou lógica inline no card
│   ├── layouts/
│   │   └── MainLayout.astro       # meta tags, fontes, SEO básico
│   ├── pages/
│   │   └── index.astro
│   └── data/
│       └── products.json
├── astro.config.mjs
├── tailwind.config.cjs
└── package.json
```

---

## 6. Modelo de dados (JSON)

Exemplo de item (campos podem ser estendidos com `categoria`, `destaque`, etc.):

```json
{
  "id": 1,
  "nome": "Bolsa elegante",
  "preco": "49,90 €",
  "descricao": "Descrição curta para o catálogo.",
  "imagem": "/images/bolsa.jpg",
  "videoUrl": "https://www.youtube.com/watch?v=..."
}
```

- **Número de WhatsApp** da loja: constante no código ou em config (um único sitio para alterar).

---

## 7. WhatsApp (regra de negócio)

Construir o link dinamicamente a partir do produto:

```text
https://wa.me/<NUMERO_SO_COM_DIGITOS>?text=<MENSAGEM_ENCODED>
```

Exemplo de mensagem (adaptar idioma e moeda):

```text
Olá! Vi o produto *Bolsa elegante* por *49,90 €* no site e gostaria de comprar.
```

No site: botão estilo CTA **verde** (“Comprar no WhatsApp”), `target="_blank"` e `rel="noopener noreferrer"`.

---

## 8. UX / UI

- **Início:** nome da loja, eventual banner, grelha de produtos
- **Cada produto:** imagem, nome, preço, descrição curta; vídeo só se existir (thumbnail + link ou embed leve)
- **Acessibilidade:** textos alternativos nas imagens, contraste legível com as cores rosa/roxo/branco

---

## 9. SEO e partilha (básico)

- `title`, `meta description`, Open Graph (imagem e texto ao partilhar no WhatsApp/Facebook)
- Opcional futuro: dados estruturados `LocalBusiness` para pesquisa local

---

## 10. Segurança (escopo deste projeto)

- HTTPS na hospedagem (quem publica o site garante o certificado)
- Não expor dados sensíveis no repositório público
- Se existir formulário no futuro: validar e sanitizar entradas

---

## 11. Trade-offs aceites

| Decisão | Consequência |
|---------|----------------|
| Sem backend | Sem carrinho nem stock em tempo real no site |
| Venda via WhatsApp | Depende da app e da disponibilidade da loja |
| Catálogo estático / JSON | Atualizar produtos implica novo build ou CMS na fase 2 |

---

## 12. Roadmap

1. **MVP:** Astro + Tailwind + `products.json` + WhatsApp + mobile-first + cores da marca  
2. **Conforto para a dona da loja:** CMS (Decap ou Sanity) — adicionar/editar produtos sem tocar em código  
3. **Catálogo maior:** categorias, filtros ou busca simples no cliente (ex.: Fuse.js)  
4. **Métricas:** Analytics se fizer sentido para campanhas  

---

## 13. Mídia — aviso importante

Se a proprietária enviar **muitos vídeos grandes** ou fotos sem comprimir:

- O site fica lento no 4G
- Pode esgotar tráfego incluído em planos gratuitos de hospedagem

**Boas práticas:** comprimir imagens (ex.: TinyPNG), vídeos curtos em YouTube “Não listado”, ou URLs de CDN (Cloudinary) no JSON.

---

## 14. Publicação em produção

**Fora do âmbito deste documento** — quem desenvolve trata do build e do ambiente de produção.

---

## 15. Conclusão

Este plano entrega valor rápido: **catálogo bonito no telemóvel**, **contacto direto no WhatsApp**, e um caminho claro para a dona da loja **ganhar autonomia** com CMS, sem precisar de programar.
