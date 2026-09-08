import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'src', 'data', 'products.json');
const IMAGES_ROOT = path.join(ROOT, 'public', 'images');
const BUCKET = 'product-images';

async function loadEnv(file) {
  const out = {};
  try {
    const text = await fs.readFile(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sem ficheiro .env */
  }
  return out;
}

const env = await loadEnv(path.join(ROOT, '.env'));
const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.PUBLIC_SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (.env).');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
const anon = ANON ? createClient(SUPABASE_URL, ANON) : null;

const purify = (v) => String(v ?? '').replace(/\u0000/g, '').trim();

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function priceNumber(value) {
  return Number(String(value).replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const LOCAL_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

async function bucketExists() {
  const { data } = await admin.storage.listBuckets();
  return (data || []).some((b) => b.id === BUCKET);
}

async function ensureUploaded({ id, localFile, ext, altText }) {
  const storagePath = `products/${id}/${randomUUID()}${ext}`;
  const fileBuf = await fs.readFile(localFile);
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, fileBuf, {
    contentType: LOCAL_MIME[ext] || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw new Error(`upload ${storagePath} falhou: ${error.message}`);
  console.log(`  uploaded ${storagePath}`);
  return {
    storage_path: storagePath,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`,
    alt_text: altText,
  };
}

async function main() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const { products } = JSON.parse(raw);
  console.log(`produtos no JSON: ${products.length}`);

  if (!(await bucketExists())) {
    console.error(`ERRO: bucket '${BUCKET}' não existe. Correr primeiro a secção 7 (SQL do Storage) do Supabase.md.`);
    process.exit(1);
  }
  console.log(`bucket '${BUCKET}' ok`);

  const ids = products.map((p) => p.id);
  const { data: existingRows, error: fetchErr } = await admin.from('produtosloja').select('id, imagens').in('id', ids);
  if (fetchErr) throw fetchErr;
  const existingByBasename = new Map();
  for (const row of existingRows || []) {
    for (const img of row.imagens || []) {
      existingByBasename.set(path.basename(String(img.storage_path || '')), row.id);
    }
  }

  const rows = [];
  let totalImages = 0;
  const reuses = [];
  const uploads = [];

  for (const product of products) {
    const id = Number(product.id);
    const nome = purify(product.nome);
    const slug = slugify(nome);
    const rawImages = Array.isArray(product.images) && product.images.length
      ? product.images
      : product.imagem
        ? [{ url: product.imagem, alt: `Fotografia do produto: ${nome}`, order: 0, isCover: true }]
        : [];

    const imagens = [];
    rawImages.forEach((img, index) => {
      const localPath = path.join(IMAGES_ROOT, path.basename(String(img.url || '')));
      const ext = path.extname(localPath).toLowerCase();
      const basename = path.basename(localPath);
      const altText = purify(img.alt) || `Fotografia do produto: ${nome}`;
      const sortOrder = Number.isFinite(Number(img.order)) ? Number(img.order) : index;
      const isCover = Boolean(img.isCover) || (!imagens.length && index === 0);
      if (existingByBasename.has(basename)) {
        const stored = (existingRows || [])
          .flatMap((r) => r.imagens || [])
          .find((x) => path.basename(String(x.storage_path || '')) === basename);
        imagens.push({
          storage_path: stored.storage_path,
          public_url: stored.public_url,
          alt_text: altText,
          sort_order: sortOrder,
          is_cover: isCover,
        });
        reuses.push(basename);
      } else {
        const entry = { id, localPath, ext, altText, sort_order: sortOrder, is_cover: isCover };
        uploads.push(entry);
        // passo placeholder — carregamos depois por ordem
        imagens.push(entry);
      }
    });

    rows.push({
      id,
      slug,
      categoria: purify(product.categoria),
      nome,
      preco_kz: priceNumber(product.preco),
      preco_texto: purify(product.preco),
      descricao: purify(product.descricao),
      status: purify(product.status) || 'disponivel',
      destaque: Boolean(product.destaque),
      lancamento: Boolean(product.lancamento),
      mais_vendido: Boolean(product.mais_vendido),
      imagens,
    });
    totalImages += rawImages.length;
  }

  console.log(`imagens a reutilizar (já no storage): ${reuses.length}`);
  console.log(`imagens a carregar de novo: ${uploads.length}`);

  for (const u of uploads) {
    const uploaded = await ensureUploaded({ id: u.id, localFile: u.localPath, ext: u.ext, altText: u.altText });
    const row = rows.find((r) => r.id === u.id);
    const idx = row.imagens.findIndex((e) => e.localPath === u.localPath);
    const place = row.imagens[idx];
    row.imagens[idx] = { ...uploaded, sort_order: place.sort_order, is_cover: place.is_cover };
  }

  const out = rows.map(({ imagens, ...r }) => ({
    ...r,
    imagens,
    preco_antigo_kz: null,
  }));

  const { data: upserted, error: upsertErr } = await admin
    .from('produtosloja')
    .upsert(out, { onConflict: 'id' })
    .select('id, slug');
  if (upsertErr) throw new Error(`upsert falhou: ${upsertErr.message}`);
  console.log(`upsert: ${upserted.length} produtos em produtosloja`);

  const { count: dbCount, error: countErr } = await admin
    .from('produtosloja')
    .select('id', { count: 'exact', head: true });
  if (countErr) throw countErr;
  console.log(`total de produtos na BD: ${dbCount}`);

  const { data: buckets } = await admin.storage.listBuckets();
  console.log(`buckets: ${(buckets || []).map((b) => b.id).join(', ')}`);

  const idsStr = ids.join(',');
  const { data: checkRows, error: checkErr } = await admin
    .from('produtosloja')
    .select('id, nome, slug, preco_kz, preco_texto, imagens')
    .order('id', { ascending: true });
  if (checkErr) throw checkErr;

  let covers = 0;
  for (const row of checkRows || []) {
    const imgs = row.imagens || [];
    console.log(`  #${row.id} ${row.nome} | slug=${row.slug} | ${row.preco_texto} -> ${row.preco_kz} | ${imgs.length} img | capa(s)=${imgs.filter((i) => i.is_cover).length}`);
    covers += imgs.filter((i) => i.is_cover).length;
  }
  console.log(`\ncapa total verificada: ${covers} (esperado ${products.length})`);
  console.log(`imagens nos arrays: ${totalImages}`);

  if (anon) {
    const { data: anonRead } = await anon.from('produtosloja').select('id').limit(1);
    console.log(`\nanon leitura: ${anonRead ? 'OK' : 'falhou'}`);
    const { error: anonWrite } = await anon.from('produtosloja').insert({ id: 999999, slug: 'teste-rls', categoria: 'catalogo', nome: 'x', preco_kz: 1, preco_texto: 'x', descricao: 'x', status: 'disponivel' });
    if (anonWrite) {
      console.log(`anon escrita: BLOQUEADA pela RLS (${anonWrite.code || anonWrite.message}) ✓`);
    } else {
      console.log('ATENÇÃO: anon conseguiu escrever! A limpar o registo de teste...');
      await anon.from('produtosloja').delete().eq('id', 999999);
      console.log('ATENÇÃO: RLS NÃO está a bloquear escritas anon.');
    }
  }

  console.log('\n--- PRÓXIMO PASSO (manual, no SQL Editor do Supabase) ---');
  console.log('Ajustar a sequence para o primeiro produto novo não colidir:');
  console.log("  select setval('public.produtosloja_id_seq', (select max(id) from public.produtosloja));");
}

main().catch((err) => {
  console.error('Falhou:', err.message);
  process.exit(1);
});