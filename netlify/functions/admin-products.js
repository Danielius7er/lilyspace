import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import Busboy from 'busboy';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'products.json');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

function json(status, payload) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
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
  return process.env.ADMIN_PANEL_TOKEN_SECRET || 'dev-secret';
}

function tokenForPassword(password) {
  return crypto.createHmac('sha256', getTokenSecret()).update(password).digest('hex');
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
        files: 1,
        fileSize: 8 * 1024 * 1024, // 8MB (ajustável)
      },
    });

    const fields = {};
    let file = null;

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, stream, filename, encoding, mimetype) => {
      if (name !== 'imagem') {
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
        file = { name, filename: safeName, mimetype, buffer: buf };
      });
    });

    bb.on('error', reject);

    bb.on('finish', () => resolve({ fields, file }));
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
    if (!adminPassword) {
      return json(500, { ok: false, error: 'ADMIN_PANEL_PASSWORD não configurado no Netlify.' });
    }

    // LOGIN (JSON)
    if (action === 'login') {
      const body = event.body ? JSON.parse(event.body) : {};
      const password = body.password || '';
      if (!password || password !== adminPassword) {
        return json(401, { ok: false, error: 'Senha inválida.' });
      }
      const generatedToken = tokenForPassword(password);
      return json(200, { ok: true, token: generatedToken });
    }

    // Autenticação (JSON ou multipart)
    let token = '';
    if (isMultipart(event)) {
      const parsed = await parseMultipart(event);
      token = parsed.fields?.token || '';
      // Reusa parsed para save/list
      if (action === 'list') {
        const expected = tokenForPassword(adminPassword);
        if (!token || token !== expected) {
          return json(401, { ok: false, error: 'Não autenticado.' });
        }
        const products = await readProducts();
        return json(200, { ok: true, products });
      }

      if (action === 'save') {
        // continua abaixo com parsed (mantemos parsed local)
        event._parsedMultipart = parsed;
      }
    }

    if (!event._parsedMultipart) {
      const body = event.body ? JSON.parse(event.body) : {};
      token = body.token || '';
    }

    const expected = tokenForPassword(adminPassword);
    if (!token || token !== expected) {
      return json(401, { ok: false, error: 'Não autenticado.' });
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
        imageValue = parsed.file; // {buffer, filename, mimetype}
      } else {
        const body = event.body ? JSON.parse(event.body) : {};
        fields = body;
        imageValue = fields.imagem; // string URL/path
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

      let imagem = null;

      if (isMultipart(event)) {
        if (!imageValue || !Buffer.isBuffer(imageValue.buffer)) {
          return json(400, { ok: false, error: 'Imagem obrigatória (upload)' });
        }

        await ensureImagesDir();

        const ext = path.extname(imageValue.filename) || '';
        const base = path.basename(imageValue.filename, ext);
        const nonce = crypto.randomBytes(6).toString('hex');
        const filename = sanitizeFilename(`${base}-${nonce}${ext}`);

        const outPath = path.join(IMAGES_DIR, filename);
        await fs.writeFile(outPath, imageValue.buffer);

        imagem = `/images/${filename}`;
      } else {
        const imagemStr = String(fields.imagem || '').trim();
        if (!imagemStr) {
          return json(400, { ok: false, error: 'Campo obrigatório ausente: imagem' });
        }
        imagem = imagemStr;
      }

      const normalized = {
        id,
        categoria: fields.categoria,
        nome: String(fields.nome),
        preco: String(fields.preco),
        descricao: String(fields.descricao),
        imagem,
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
