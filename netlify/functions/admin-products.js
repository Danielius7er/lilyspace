import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'products.json');

// ✅ Corrigido: retorna objeto, não usa res
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

export async function handler(event, context) {
  try {
    const url = new URL(event.rawUrl || event.path || '/', 'https://local');
    const action = url.searchParams.get('action');
    const body = event.body ? JSON.parse(event.body) : {};

    const password = body.password || '';
    const token = body.token || '';

    const adminPassword = getAdminPassword();
    if (!adminPassword) {
      // ✅ Sem context.res
      return json(500, { ok: false, error: 'ADMIN_PANEL_PASSWORD não configurado no Netlify.' });
    }

    if (action === 'login') {
      if (!password || password !== adminPassword) {
        return json(401, { ok: false, error: 'Senha inválida.' });
      }
      const generatedToken = tokenForPassword(password); // ✅ sem shadowing
      return json(200, { ok: true, token: generatedToken });
    }

    // Ações autenticadas
    const expected = tokenForPassword(adminPassword);
    if (!token || token !== expected) {
      return json(401, { ok: false, error: 'Não autenticado.' });
    }

    if (action === 'list') {
      const products = await readProducts();
      return json(200, { ok: true, products });
    }

    if (action === 'save') {
      const required = ['id', 'categoria', 'nome', 'preco', 'descricao', 'imagem', 'status'];
      for (const k of required) {
        if (body[k] === undefined || body[k] === null || body[k] === '') {
          return json(400, { ok: false, error: `Campo obrigatório ausente: ${k}` });
        }
      }

      const products = await readProducts();
      const id = Number(body.id);
      if (!Number.isFinite(id) || id < 1) {
        return json(400, { ok: false, error: 'ID inválido.' });
      }

      const normalized = {
        id,
        categoria: body.categoria,
        nome: String(body.nome),
        preco: String(body.preco),
        descricao: String(body.descricao),
        imagem: String(body.imagem),
        status: body.status,
      };
      if (body.videoUrl) normalized.videoUrl = String(body.videoUrl);

      const idx = products.findIndex(p => Number(p.id) === id);
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