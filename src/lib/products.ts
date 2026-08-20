import productsData from "../data/products.json";

export type Product = (typeof productsData.products)[number] & {
  slug?: string;
  preco_antigo?: string;
  destaque?: boolean;
  lancamento?: boolean;
  mais_vendido?: boolean;
  imagem?: string;
  images?: ProductImage[];
  variacoes?: string[];
  criado_em?: string;
};

export type ProductImage = { url: string; alt: string; order: number; isCover?: boolean };

export const products: Product[] = productsData.products;

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function productSlug(product: Product) { return product.slug || slugify(product.nome); }

/** Normalises legacy `imagem` and the new gallery model in one place. */
export function productImages(product: Product): ProductImage[] {
  const images = product.images?.length ? product.images : product.imagem ? [{ url: product.imagem, alt: `Fotografia do produto: ${product.nome}`, order: 0, isCover: true }] : [];
  return [...images].sort((a, b) => a.order - b.order);
}
export function productCover(product: Product) {
  const images = productImages(product);
  return images.find((image) => image.isCover)?.url || images[0]?.url || product.imagem || "";
}

export function categoryLabel(product: Product) {
  if (product.categoria === "kit") return "Kits e combos";
  if (/touca/i.test(product.nome)) return "Toucas de cetim";
  return "Laços e acessórios";
}

export function categorySlug(product: Product) { return slugify(categoryLabel(product)); }
export function priceNumber(value: string) { return Number(value.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".")) || 0; }
export function discount(product: Product) {
  if (!product.preco_antigo) return undefined;
  const oldPrice = priceNumber(product.preco_antigo), price = priceNumber(product.preco);
  return oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;
}
export const categories = Array.from(new Map(products.map((product) => [categorySlug(product), categoryLabel(product)])).entries()).map(([slug, label]) => ({ slug, label }));
