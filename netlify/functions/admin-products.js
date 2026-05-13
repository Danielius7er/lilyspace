import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'products.json');

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readProducts() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);
  return data.products || [];
}

async function writeProducts(products) {
  const data = { products };
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getAdminPassword() {
  // Configure no Netlify: ADMIN_PANEL_PASSWORD
  return process.env.ADMIN_PANEL_PASSWORD || '';
}

function getTokenSecret() {
  // Opcional; configure no Netlify: ADMIN_PANEL_TOKEN_SECRET
  return process.env.ADMIN_PANEL_TOKEN_SECRET || 'dev-secret';
}

function tokenForPassword(password) {
  const secret = getTokenSecret();
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

export async function handler(event, context) {
  try {
    const url = new URL(event.rawUrl || event.path || '/', 'https://local');
    const action = url.searchParams.get('action');
    const body = event.body ? JSON.parse(event.body) : {};

    const password = body.password || '';
    const token = body.token || '';

    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      return json(context.res, 500, { ok: false, error: 'ADMIN_PANEL_PASSWORD não configurado no Netlify.' });
    }

    if (action === 'login') {
      if (!password || password !== adminPassword) {
        return json(context.res, 401, { ok: false, error: 'Senha inválida.' });
      }
      const token = tokenForPassword(password);
      return json(context.res, 200, { ok: true, token });
    }

    // actions below require auth
    const expected = tokenForPassword(adminPassword);
    if (!token || token !== expected) {
      return json(context.res, 401, { ok: false, error: 'Não autenticado.' });
    }

    if (action === 'list') {
      const products = await readProducts();
      return json(context.res, 200, { ok: true, products });
    }

    if (action === 'save') {
      const payload = body;
      const required = ['id', 'categoria', 'nome', 'preco', 'descricao', 'imagem', 'status'];
      for (const k of required) {
        if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
          return json(context.res, 400, { ok: false, error: `Campo obrigatório ausente: ${k}` });
        }
      }

      const products = await readProducts();
      const id = Number(payload.id);
      if (!Number.isFinite(id) || id < 1) {
        return json(context.res, 400, { ok: false, error: 'ID inválido.' });
      }

      const normalized = {
        id,
        categoria: payload.categoria,
        nome: String(payload.nome),
        preco: String(payload.preco),
        descricao: String(payload.descricao),
        imagem: String(payload.imagem),
        status: payload.status,
      };
      if (payload.videoUrl) normalized.videoUrl = String(payload.videoUrl);

      const idx = products.findIndex(p => Number(p.id) === id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...normalized };
      } else {
        products.push(normalized);
      }

      await writeProducts(products);
      return json(context.res, 200, { ok: true });
    }

    return json(context.res, 400, { ok: false, error: 'Ação inválida.' });
  } catch (e) {
    return json(context.res, 500, { ok: false, error: e?.message || 'Erro interno.' });
  }
}

