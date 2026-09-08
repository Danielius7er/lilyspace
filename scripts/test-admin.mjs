import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { handler } from '../netlify/functions/admin-products.js';

async function loadEnv(file) {
  const out = {};
  try {
    const text = await fs.readFile(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return out;
}

const env = await loadEnv(path.join(process.cwd(), '.env'));
for (const key of Object.keys(env)) process.env[key] ||= env[key];

const PASSWORD = process.env.ADMIN_PANEL_PASSWORD;
const SECRET = process.env.ADMIN_PANEL_TOKEN_SECRET;
if (!PASSWORD || !SECRET) {
  console.error('Define ADMIN_PANEL_PASSWORD e ADMIN_PANEL_TOKEN_SECRET nas env vars para o teste.');
  process.exit(1);
}

function call(action, body, cookie, multipart) {
  const event = {
    rawUrl: `https://local/.netlify/functions/admin-products?action=${action}`,
    headers: {},
    body: null,
    isBase64Encoded: false,
  };
  if (multipart) event.headers['content-type'] = 'multipart/form-data; boundary=----testboundary';
  else event.headers['content-type'] = 'application/json';
  if (cookie) event.headers.cookie = cookie;
  if (multipart) {
    const chunk = (name, value) => `------testboundary\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
    const fileChunk = (name, filename, buffer) =>
      `------testboundary\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n${buffer.toString(buffer.length ? 'utf8' : 'utf8')}\r\n`;
    let bodyStr = '';
    if (body) {
      for (const [k, v] of Object.entries(body)) bodyStr += chunk(k, v);
    }
    bodyStr += fileChunk('images', 'falso.txt', Buffer.from('não sou uma imagem', 'utf8'));
    bodyStr += '------testboundary--\r\n';
    event.body = Buffer.from(bodyStr, 'utf8').toString('base64');
    event.isBase64Encoded = true;
  } else if (body) {
    event.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return handler(event, {});
}

function cookieFrom(response) {
  const setCookie = response.headers['Set-Cookie'] || response.headers['set-cookie'] || '';
  const match = String(setCookie).match(/admin_session=([^;]+)/);
  return match ? `admin_session=${decodeURIComponent(match[1])}` : null;
}

function pngBuffer() {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, crypto.randomBytes(64)]);
}

function makeMultipart(body, files = []) {
  return {
    body,
    files,
  };
}

async function main() {
  const bad = await call('login', { password: 'errada' });
  console.log(`login senha errada -> ${bad.statusCode}`);

  const good = await call('login', { password: PASSWORD });
  const cookie = cookieFrom(good);
  console.log(`login correta -> ${good.statusCode} ${cookie ? 'cookie ok' : 'SEM COOKIE'}`);

  const list = await call('list', null, cookie);
  console.log(`list -> ${list.statusCode}, ${JSON.parse(list.body).products?.length} produtos`);

  const png = pngBuffer();
  const MIME_BOUNDARY = '----xboundaryx';
  const chunk = (name, value) => `--${MIME_BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  const filePart = (name, filename, buf, mime) =>
    `--${MIME_BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n${buf.toString('latin1')}\r\n`;
  const build = (fields, buf, filename, mime, contentType = 'image/png') => {
    let s = '';
    for (const [k, v] of Object.entries(fields)) s += chunk(k, v);
    s += filePart('images', filename, buf, contentType);
    s += `--${MIME_BOUNDARY}--\r\n`;
    const event = {
      rawUrl: `https://local/.netlify/functions/admin-products?action=save`,
      headers: { 'content-type': `multipart/form-data; boundary=${MIME_BOUNDARY}`, cookie },
      body: Buffer.from(s, 'latin1').toString('base64'),
      isBase64Encoded: true,
    };
    return handler(event, {});
  };

  const fake = await build({ id: '9001', categoria: 'catalogo', nome: 'Teste', preco: '100,00 Kz', descricao: 'x', status: 'disponivel' }, Buffer.from('não sou imagem', 'utf8'), 'falso.txt', 'text/plain');
  console.log(`save com ficheiro falso -> ${fake.statusCode} (esperado 400): ${JSON.parse(fake.body).error}`);

  const real = await build({ id: '9001', categoria: 'catalogo', nome: 'Teste temporário', preco: '100,00 Kz', descricao: 'x', status: 'disponivel', existingImages: '[]' }, png, 'foto.png', 'image/png');
  console.log(`save novo produto com png -> ${real.statusCode}: ${JSON.parse(real.body).ok ?? JSON.parse(real.body).error}`);

  const list2 = await call('list', null, cookie);
  const row = JSON.parse(list2.body).products.find((p) => p.id === 9001);
  console.log(`produto 9001 -> ${row ? `${row.images.length} img` : 'não existe'}`);
  console.log(`  debug cookie tail: ${cookie?.slice(-30)}`);

  const editJson = await call('save', { id: 9001, categoria: 'kit', nome: 'Teste temporário editado', preco: '200,00 Kz', descricao: 'y', status: 'esgotado', existingImages: JSON.stringify(row ? row.images : []) }, cookie);
  console.log(`save edição JSON (sem fotos novas) -> ${editJson.statusCode}: ${JSON.parse(editJson.body).ok ?? JSON.parse(editJson.body).error}`);
  console.log(`  debug: cookie len=${cookie?.length}, row images=${row?.images?.length}, apiErr=${JSON.parse(editJson.body).error}`);

  const list3 = await call('list', null, cookie);
  const edited = JSON.parse(list3.body).products.find((p) => p.id === 9001);
  console.log(`após edição -> categoria=${edited?.categoria}, status=${edited?.status}, imgs=${edited?.images.length}, preco=${edited?.preco}`);

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  for (const testId of [9001, 9002]) {
    const { data: rowNow } = await admin.from('produtosloja').select('imagens').eq('id', testId).maybeSingle();
    const paths = (rowNow?.imagens || []).map((i) => i.storage_path).filter(Boolean);
    if (paths.length) await admin.storage.from('product-images').remove(paths);
    await admin.from('produtosloja').delete().eq('id', testId);
  }
  console.log('limpeza de produtos de teste e ficheiros no storage concluída');
}

main().catch((e) => {
  console.error('Teste falhou:', e.message);
  process.exit(1);
});