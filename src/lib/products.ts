import productsData from "../data/products.json";
import { getSupabase } from "./supabase";

export type Product = {
  id: number;
  categoria: string;
  nome: string;
  preco: string;
  preco_antigo?: string;
  descricao: string;
  status: string;
  imagem?: string;
  images?: ProductImage[];
  slug?: string;
  destaque?: boolean;
  lancamento?: boolean;
  mais_vendido?: boolean;
  variacoes?: string[];
  videoUrl?: string;
  criado_em?: string;
};

export type ProductImage = { url: string; alt: string; order: number; isCover?: boolean };

type ProductsRow = {
  id: number;
  slug: string;
  categoria: string;
  nome: string;
  preco_kz: number;
  preco_texto: string;
  preco_antigo_kz: number | null;
  descricao: string;
  status: string;
  destaque: boolean;
  lancamento: boolean;
  mais_vendido: boolean;
  imagens?: ProductImageRow[];
  video_url?: string | null;
  created_at?: string;
};

type ProductImageRow = {
  storage_path: string;
  public_url?: string | null;
  alt_text: string;
  sort_order: number;
  is_cover: boolean;
};

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function productSlug(product: Product) { return product.slug || slugify(product.nome); }

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

export function getCategories(products: Product[]) {
  return Array.from(new Map(products.map((product) => [categorySlug(product), categoryLabel(product)])).entries()).map(([slug, label]) => ({ slug, label }));
}

export function priceNumber(value: string) { return Number(value.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".")) || 0; }

export function discount(product: Product) {
  if (!product.preco_antigo) return undefined;
  const oldPrice = priceNumber(product.preco_antigo), price = priceNumber(product.preco);
  return oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;
}

function storageUrl(storagePath: string) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  return url ? `${url}/storage/v1/object/public/product-images/${storagePath}` : "";
}

function imageFromRow(image: ProductImageRow): ProductImage {
  return {
    url: image.public_url || storageUrl(image.storage_path),
    alt: image.alt_text,
    order: image.sort_order,
    isCover: Boolean(image.is_cover),
  };
}

function formatKz(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const [int, dec] = value.toFixed(2).split(".");
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec} Kz`;
}

function fromRow(row: ProductsRow): Product {
  const rows = Array.isArray(row.imagens) ? row.imagens : [];
  const images = [...rows].sort((a, b) => a.sort_order - b.sort_order).map(imageFromRow);
  const cover = images.find((image) => image.isCover) || images[0];
  return {
    id: row.id,
    slug: row.slug,
    categoria: row.categoria,
    nome: row.nome,
    preco: row.preco_texto,
    preco_antigo: formatKz(row.preco_antigo_kz),
    descricao: row.descricao,
    status: row.status,
    destaque: Boolean(row.destaque),
    lancamento: Boolean(row.lancamento),
    mais_vendido: Boolean(row.mais_vendido),
    imagem: cover?.url,
    images,
    videoUrl: row.video_url || undefined,
    criado_em: row.created_at,
  };
}

let cached: Product[] | undefined;

export async function getProducts(): Promise<Product[]> {
  if (import.meta.env.PROD && cached) return cached;

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("produtosloja")
      .select("*")
      .order("id", { ascending: true });

    if (!error && Array.isArray(data) && data.length) {
      const result = (data as unknown as ProductsRow[]).map(fromRow);
      if (import.meta.env.PROD) cached = result;
      return result;
    }
    if (error) console.warn(`[supabase] falha ao ler produtosloja: ${error.message}`);
  }

  const fallback = (productsData.products ?? []) as unknown as Product[];
  if (import.meta.env.PROD) cached = fallback;
  return fallback;
}