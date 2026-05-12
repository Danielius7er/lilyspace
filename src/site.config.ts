/**
 * Configuração única da loja — alterar aqui o nome, URL e WhatsApp.
 * whatsappE164: só dígitos, com indicativo do país (ex.: 244..., 351...).
 */
export const site = {
  name: "Lili_space",
  tagline:
    "Acessórios de cabelo com amor — laços, toucas de cetim e novidades da coleção.",
  description:
    "Catálogo Lili_space: laços e toucas de cetim. Encomende pelo WhatsApp com um toque.",
  whatsappE164: "244942779177",
  /**
   * URL final do site (sem barra no fim). Atualizar após o deploy — afeta
   * canonical, Open Graph e partilhas no WhatsApp.
   */
  canonicalUrl: "https://exemplo.pt",
} as const;
