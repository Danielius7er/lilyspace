import crypto from 'node:crypto';
import path from 'node:path';
import Busboy from 'busboy';
import { createClient } from '@supabase/supabase-js';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 15 * 60;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const BUCKET = 'product-images';
const MAX_FILES = 12;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const loginAttempts = new Map();

function json(status, payload, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

function env(name) {
  return (process.env[name] || '').trim();
}

function guardConfig() {
  const missing = [
    'ADMIN_PANEL_PASSWORD',
    'ADMIN_PANEL_TOKEN_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ].filter((name) => !env(name));
  if (missing.length) {
    return `Faltam variáveis de ambiente no Netlify: ${missing.join(', ')}`;
  }
  return null;
}

function getClientIp(event) {
  const forwarded = event.headers?.['x-forwarded-for'] || event.headers?.['X-Forwarded-For'] || '';
  return String(forwarded).split(',')[0].trim() || 'unknown';
}

function tooManyLoginAttempts(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.resetAt) return false;
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function registerFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

function sign(value) {
  return crypto.createHmac('sha256', env('ADMIN_PANEL_TOKEN_SECRET')).update(value).digest('base64url');
}

function createSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS, nonce: crypto.randomBytes(24).toString('base64url') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function sessionIsValid(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    return Number(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function getCookie(event, name) {
  const cookies = String(event.headers?.cookie || event.headers?.Cookie || '').split(';');
  const prefix = `${name}=`;
  const item = cookies.map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : '';
}

function sessionCookie(token, event, maxAge = SESSION_TTL_SECONDS) {
  const forwardedProto = event.headers?.['x-forwarded-proto'] || event.headers?.['X-Forwarded-Proto'] || '';
  const secure = String(forwardedProto).split(',')[0] === 'https' || String(event.rawUrl || '').startsWith('https://');
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function priceNumber(value) {
  return Number(String(value).replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function publicUrl(storagePath) {
  return `${env('SUPABASE_URL')}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

function deriveStoragePath(imageUrl) {
  const marker = `/${BUCKET}/`;
  const idx = String(imageUrl || '').indexOf(marker);
  return idx >= 0 ? String(imageUrl).slice(idx + marker.length) : null;
}

async function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
    const bb = Busboy({
      headers: { 'content-type': contentType },
      limits: { files: MAX_FILES, fileSize: MAX_FILE_BYTES },
    });

    const fields = {};
    const files = [];

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, stream) => {
      if (name !== 'images') {
        stream.resume();
        return;
      }
      const chunks = [];
      let truncated = false;
      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => { truncated = true; });
      stream.on('end', () => {
        if (truncated) return;
        files.push({ buffer: Buffer.concat(chunks) });
      });
    });

    bb.on('error', reject);
    bb.on('finish', () => resolve({ fields, files }));
    const body = event.isBase64Encoded ? Buffer.from(String(event.body || ''), 'base64') : (event.body || Buffer.alloc(0));
    bb.end(body);
  });
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: '.jpg', mime: 'image/jpeg' };
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) return { ext: '.png', mime: 'image/png' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { ext: '.webp', mime: 'image/webp' };
  return null;
}

function toAdminProduct(row) {
  const imagens = Array.isArray(row.imagens) ? row.imagens : [];
  const images = [...imagens]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      url: img.public_url || publicUrl(img.storage_path),
      storagePath: img.storage_path || null,
      alt: img.alt_text || '',
      order: img.sort_order ?? 0,
      isCover: Boolean(img.is_cover),
    }));
  const cover = images.find((img) => img.isCover) || images[0];
  return {
    id: row.id,
    slug: row.slug,
    categoria: row.categoria,
    nome: row.nome,
    preco: row.preco_texto,
    descricao: row.descricao,
    status: row.status,
    destaque: Boolean(row.destaque),
    lancamento: Boolean(row.lancamento),
    mais_vendido: Boolean(row.mais_vendido),
    imagem: cover?.url || '',
    images,
  };
}

function parseJsonField(fields, name) {
  const raw = String(fields[name] || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }
}

export async function handler(event, context) {
  try {
    const configError = guardConfig();
    if (configError) {
      console.error(configError);
      return json(500, { ok: false, error: 'Configuração do servidor incompleta.' });
    }

    const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
    const url = new URL(event.rawUrl || event.path || '/', 'https://local');
    const action = url.searchParams.get('action');

    if (action === 'logout') return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', event, 0) });

    if (action === 'login') {
      const ip = getClientIp(event);
      if (tooManyLoginAttempts(ip)) return json(429, { ok: false, error: 'Demasiadas tentativas. Tente novamente dentro de 15 minutos.' });
      const body = event.body ? JSON.parse(event.body) : {};
      if (!body.password || body.password !== env('ADMIN_PANEL_PASSWORD')) {
        registerFailedLogin(ip);
        return json(401, { ok: false, error: 'Senha inválida.' });
      }
      clearLoginAttempts(ip);
      return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(createSession(), event) });
    }

    const token = getCookie(event, SESSION_COOKIE);
    if (!sessionIsValid(token)) return json(401, { ok: false, error: 'Não autenticado.' });

    if (isMultipart(event)) {
      const parsed = await parseMultipart(event);
      event._parsed = parsed;
    }

    if (action === 'list') {
      const { data, error } = await admin.from('produtosloja').select('*').order('id', { ascending: true });
      if (error) throw new Error(`list produtosloja: ${error.message}`);
      return json(200, { ok: true, products: (data || []).map(toAdminProduct) });
    }

    if (action === 'save') {
      const multipart = isMultipart(event);
      const parsed = event._parsed || (multipart ? await parseMultipart(event) : null);
      const fields = multipart ? parsed.fields : (event.body ? JSON.parse(event.body) : {});
      const newFiles = multipart ? parsed.files : [];

      const required = ['id', 'categoria', 'nome', 'preco', 'descricao', 'status'];
      for (const k of required) {
        if (fields[k] === undefined || fields[k] === null || String(fields[k]).trim() === '') {
          return json(400, { ok: false, error: `Campo obrigatório ausente: ${k}` });
        }
      }

      const id = Number(fields.id);
      if (!Number.isFinite(id) || id < 1 || !Number.isInteger(id)) {
        return json(400, { ok: false, error: 'ID inválido.' });
      }

      const categoria = String(fields.categoria);
      const status = String(fields.status);
      const nome = String(fields.nome).slice(0, 160);
      const descricao = String(fields.descricao).slice(0, 5000);
      const precoTexto = String(fields.preco).slice(0, 80);

      if (!['catalogo', 'kit'].includes(categoria)) return json(400, { ok: false, error: 'Categoria inválida.' });
      if (!['disponivel', 'esgotado'].includes(status)) return json(400, { ok: false, error: 'Estado inválido.' });

      const { data: existingRow, error: rowError } = await admin
        .from('produtosloja')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (rowError) throw new Error(`buscar produto ${id}: ${rowError.message}`);

      const existingImages = parseJsonField(fields, 'existingImages');
      if (existingImages === null) return json(400, { ok: false, error: 'existingImages em formato inválido.' });
      const removeImages = parseJsonField(fields, 'removeImages');
      if (removeImages === null) return json(400, { ok: false, error: 'removeImages em formato inválido.' });

      const kept = [];
      const removedKeys = new Set();
      for (const entry of existingImages) {
        const storagePath = entry.storagePath || deriveStoragePath(entry.url);
        if (storagePath) removedKeys.add(storagePath);
        kept.push({
          storage_path: storagePath,
          public_url: storagePath ? null : String(entry.url || ''),
          alt_text: String(entry.alt ?? `Fotografia do produto: ${nome}`),
          sort_order: Number(entry.order) || kept.length,
          is_cover: Boolean(entry.isCover),
        });
      }

      for (const entry of removeImages) {
        const storagePath = entry.storagePath || deriveStoragePath(entry.url);
        if (storagePath) removedKeys.add(storagePath);
      }

      for (const file of newFiles) {
        const type = detectImageType(file.buffer);
        if (!type) return json(400, { ok: false, error: 'Só são aceites ficheiros de imagem reais (JPG, PNG ou WEBP).' });
        const storagePath = `products/${id}/${crypto.randomUUID()}${type.ext}`;
        const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, file.buffer, {
          contentType: type.mime,
          upsert: false,
        });
        if (uploadError) throw new Error(`upload ${storagePath}: ${uploadError.message}`);
        kept.push({
          storage_path: storagePath,
          public_url: null,
          alt_text: `Fotografia do produto: ${nome}`,
          sort_order: Math.max(0, ...kept.map((img) => img.sort_order)) + 1,
          is_cover: false,
        });
      }

      if (!kept.length) {
        return json(400, { ok: false, error: 'O produto precisa de pelo menos uma imagem.' });
      }

      if (!kept.some((img) => img.is_cover)) kept[0].is_cover = true;

      if (removedKeys.size) {
        const storagePaths = [...removedKeys].filter(Boolean);
        if (storagePaths.length) {
          await admin.storage.from(BUCKET).remove(storagePaths);
        }
      }

      const slug = slugify(nome);
      const row = {
        id,
        slug,
        categoria,
        nome,
        preco_kz: priceNumber(precoTexto),
        preco_texto: precoTexto,
        preco_antigo_kz: existingRow?.preco_antigo_kz ?? null,
        descricao,
        status,
        destaque: existingRow?.destaque ?? false,
        lancamento: existingRow?.lancamento ?? false,
        mais_vendido: existingRow?.mais_vendido ?? false,
        imagens: kept,
      };

      const { error: upsertError } = await admin.from('produtosloja').upsert(row, { onConflict: 'id' });
      if (upsertError) throw new Error(`upsert ${id}: ${upsertError.message}`);

      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: 'Ação inválida.' });
  } catch (e) {
    console.error('admin-products:', e);
    return json(500, { ok: false, error: 'Erro interno do servidor.' });
  }
}

function isMultipart(event) {
  const ct = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
  return String(ct).includes('multipart/form-data');
}