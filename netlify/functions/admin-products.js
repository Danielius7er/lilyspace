import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import Busboy from 'busboy';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'products.json');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 15 * 60;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

function json(status, payload, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

async function readProducts() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  return data.products || [];
}

async function writeProducts(products) {
  await fs.writeFile(DATA_FILE, JSON.stringify({ products }, null, 2), 'utf8');
}

function getAdminPassword() {
  return (process.env.ADMIN_PANEL_PASSWORD || '').trim();
}

function getTokenSecret() {
  return (process.env.ADMIN_PANEL_TOKEN_SECRET || '').trim();
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
  return crypto.createHmac('sha256', getTokenSecret()).update(value).digest('base64url');
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

function sanitizeFilename(name) {
  const base = path.basename(String(name || ''));
  const safe = base
    .replaceAll('..', '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
  return safe || 'imagem';
}

async function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const headers = event.headers || {};
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    const bb = Busboy({
      headers: { 'content-type': contentType },
      limits: {
        files: 12,
        fileSize: 8 * 1024 * 1024, // 8MB (ajustável)
      },
    });

    const fields = {};
    const files = [];

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, stream, filename, encoding, mimetype) => {
      if (name !== 'images') {
        // descarta campos inesperados
        stream.resume();
        return;
      }

      const safeName = sanitizeFilename(filename);
      const chunks = [];
      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => {
        // stream truncated
      });

      stream.on('end', () => {
        const buf = Buffer.concat(chunks);
        files.push({ name, filename: safeName, mimetype, buffer: buf });
      });
    });

    bb.on('error', reject);

    bb.on('finish', () => resolve({ fields, files }));
    bb.end(event.body || Buffer.alloc(0), event.isBase64Encoded);
  });
}

function isMultipart(event) {
  const headers = event.headers || {};
  const ct = headers['content-type'] || headers['Content-Type'] || '';
  return String(ct).includes('multipart/form-data');
}

async function ensureImagesDir() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

export async function handler(event, context) {
  try {
    const url = new URL(event.rawUrl || event.path || '/', 'https://local');
    const action = url.searchParams.get('action');

    const adminPassword = getAdminPassword();
    const tokenSecret = getTokenSecret();
    if (!adminPassword || !tokenSecret) {
      return json(500, { ok: false, error: 'ADMIN_PANEL_PASSWORD e ADMIN_PANEL_TOKEN_SECRET devem estar configurados no Netlify.' });
    }

    if (action === 'logout') return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', event, 0) });

    // LOGIN (JSON)
    if (action === 'login') {
      const ip = getClientIp(event);
      if (tooManyLoginAttempts(ip)) return json(429, { ok: false, error: 'Demasiadas tentativas. Tente novamente dentro de 15 minutos.' });
      const body = event.body ? JSON.parse(event.body) : {};
      const password = body.password || '';
      if (!password || password !== adminPassword) {
        registerFailedLogin(ip);
        return json(401, { ok: false, error: 'Senha inválida.' });
      }
      clearLoginAttempts(ip);
      return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(createSession(), event) });
    }

    // Autenticação por cookie HttpOnly (JSON ou multipart)
    const token = getCookie(event, SESSION_COOKIE);
    if (!sessionIsValid(token)) return json(401, { ok: false, error: 'Não autenticado.' });

    if (isMultipart(event)) {
      const parsed = await parseMultipart(event);
      // Reusa parsed para save/list
      if (action === 'list') {
        const products = await readProducts();
        return json(200, { ok: true, products });
      }

      if (action === 'save') {
        // continua abaixo com parsed (mantemos parsed local)
        event._parsedMultipart = parsed;
      }
    }

    if (action === 'list') {
      const products = await readProducts();
      return json(200, { ok: true, products });
    }

    if (action === 'save') {
      let fields = null;
      let imageValue = null;

      if (isMultipart(event)) {
        const parsed = event._parsedMultipart || (await parseMultipart(event));
        fields = parsed.fields || {};
        imageValue = parsed.files;
      } else {
        const body = event.body ? JSON.parse(event.body) : {};
        fields = body;
        imageValue = fields.images; // JSON gallery
      }

      const required = ['id', 'categoria', 'nome', 'preco', 'descricao', 'status'];
      for (const k of required) {
        if (fields[k] === undefined || fields[k] === null || fields[k] === '') {
          return json(400, { ok: false, error: `Campo obrigatório ausente: ${k}` });
        }
      }

      const products = await readProducts();
      const id = Number(fields.id);
      if (!Number.isFinite(id) || id < 1) {
        return json(400, { ok: false, error: 'ID inválido.' });
      }

      let images = [];

      if (isMultipart(event)) {
        if (!Array.isArray(imageValue) || !imageValue.length) {
          return json(400, { ok: false, error: 'Imagem obrigatória (upload)' });
        }

        await ensureImagesDir();

        for (const image of imageValue) {
          if (!String(image.mimetype || '').startsWith('image/')) return json(400, { ok: false, error: 'Only image files are allowed.' });
          const ext = path.extname(image.filename) || '';
          const base = path.basename(image.filename, ext);
          const filename = sanitizeFilename(`${base}-${crypto.randomBytes(6).toString('hex')}${ext}`);
          await fs.writeFile(path.join(IMAGES_DIR, filename), image.buffer);
          images.push({ url: `/images/${filename}`, alt: `Fotografia do produto: ${fields.nome}`, order: images.length, isCover: images.length === 0 });
        }
      } else {
        const imagemStr = String(fields.images || '').trim();
        if (!imagemStr) {
          return json(400, { ok: false, error: 'Campo obrigatório ausente: imagem' });
        }
        images = JSON.parse(imagemStr);
      }

      const normalized = {
        id,
        categoria: fields.categoria,
        nome: String(fields.nome),
        preco: String(fields.preco),
        descricao: String(fields.descricao),
        imagem: images.find((image) => image.isCover)?.url || images[0].url,
        images: images.map((image, index) => ({ url: String(image.url), alt: String(image.alt), order: Number(image.order) || index, isCover: Boolean(image.isCover) })),
        status: fields.status,
      };

      if (fields.videoUrl) normalized.videoUrl = String(fields.videoUrl);

      const idx = products.findIndex((p) => Number(p.id) === id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...normalized };
      } else {
        products.push(normalized);
      }

      await writeProducts(products);
      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: 'Ação inválida.' });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || 'Erro interno.' });
  }
}
