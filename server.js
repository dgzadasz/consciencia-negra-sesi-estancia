// Servidor do site Consciência Negra — SESI SENAI Estância
// Sem banco (DATABASE_URL vazio) salva em ./data; no Render usa Postgres.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const SENHA = process.env.ADMIN_PASSWORD || '';
const PUB = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');
const PADRAO = JSON.parse(fs.readFileSync(path.join(DATA, 'default.json'), 'utf8'));

// ---------- armazenamento ----------
let db = null;
async function iniciarBanco() {
  if (!process.env.DATABASE_URL) return;
  const { Pool } = require('pg');
  db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false });
  await db.query('CREATE TABLE IF NOT EXISTS conteudo (id int PRIMARY KEY, dados jsonb NOT NULL, atualizado timestamptz DEFAULT now())');
  await db.query('CREATE TABLE IF NOT EXISTS imagens (id serial PRIMARY KEY, tipo text NOT NULL, bytes bytea NOT NULL, criado timestamptz DEFAULT now())');
}
async function lerConteudo() {
  if (db) {
    const r = await db.query('SELECT dados FROM conteudo WHERE id=1');
    return r.rows[0] ? { ...PADRAO, ...r.rows[0].dados } : PADRAO;
  }
  const f = path.join(DATA, 'content.json');
  return fs.existsSync(f) ? { ...PADRAO, ...JSON.parse(fs.readFileSync(f, 'utf8')) } : PADRAO;
}
async function salvarConteudo(d) {
  if (db) return db.query('INSERT INTO conteudo (id,dados) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET dados=$1, atualizado=now()', [d]);
  fs.writeFileSync(path.join(DATA, 'content.json'), JSON.stringify(d, null, 2));
}
async function salvarImagem(tipo, buf) {
  if (db) return (await db.query('INSERT INTO imagens (tipo,bytes) VALUES ($1,$2) RETURNING id', [tipo, buf])).rows[0].id;
  const dir = path.join(DATA, 'uploads'); fs.mkdirSync(dir, { recursive: true });
  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  fs.writeFileSync(path.join(dir, id), buf); fs.writeFileSync(path.join(dir, id + '.type'), tipo);
  return id;
}
async function lerImagem(id) {
  if (db) { if (!/^\d+$/.test(id)) return null; const r = await db.query('SELECT tipo,bytes FROM imagens WHERE id=$1', [id]); return r.rows[0] ? { tipo: r.rows[0].tipo, bytes: r.rows[0].bytes } : null; }
  if (!/^[a-z0-9]+$/.test(id)) return null;
  const f = path.join(DATA, 'uploads', id);
  return fs.existsSync(f) ? { tipo: fs.readFileSync(f + '.type', 'utf8'), bytes: fs.readFileSync(f) } : null;
}

// ---------- login ----------
const assinar = (v) => crypto.createHmac('sha256', SENHA || 'sem-senha').update(v).digest('hex');
function logado(req) {
  const m = /(?:^|;\s*)sessao=([^;]+)/.exec(req.headers.cookie || '');
  if (!m || !SENHA) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split('.');
  if (!sig || sig.length !== 64 || !(+exp > Date.now())) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(assinar(exp)));
}

// ---------- http ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
function corpo(req, limite = 8e6) {
  return new Promise((ok, erro) => {
    let n = 0; const partes = [];
    req.on('data', (c) => { n += c.length; if (n > limite) { erro(new Error('grande demais')); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes)));
  });
}

const rotas = {
  'GET /api/conteudo': async (req, res) => json(res, 200, await lerConteudo()),
  'GET /api/sessao': async (req, res) => json(res, 200, { logado: logado(req), senhaConfigurada: !!SENHA }),
  'POST /api/login': async (req, res) => {
    const { senha } = JSON.parse(await corpo(req, 1e4) || '{}');
    if (!SENHA) return json(res, 500, { erro: 'Senha do painel não configurada (ADMIN_PASSWORD).' });
    const a = Buffer.from(String(senha || '')), b = Buffer.from(SENHA);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { await new Promise((r) => setTimeout(r, 800)); return json(res, 401, { erro: 'Senha incorreta' }); }
    const exp = String(Date.now() + 12 * 3600e3);
    res.setHeader('Set-Cookie', `sessao=${encodeURIComponent(exp + '.' + assinar(exp))}; HttpOnly; Path=/; Max-Age=43200; SameSite=Strict${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
    json(res, 200, { ok: true });
  },
  'POST /api/sair': async (req, res) => { res.setHeader('Set-Cookie', 'sessao=; Path=/; Max-Age=0'); json(res, 200, { ok: true }); },
  'PUT /api/conteudo': async (req, res) => {
    if (!logado(req)) return json(res, 401, { erro: 'Faça login' });
    const d = JSON.parse(await corpo(req, 2e6));
    if (typeof d !== 'object' || Array.isArray(d)) return json(res, 400, { erro: 'Formato inválido' });
    await salvarConteudo(d); json(res, 200, { ok: true });
  },
  'POST /api/imagem': async (req, res) => {
    if (!logado(req)) return json(res, 401, { erro: 'Faça login' });
    const tipo = req.headers['content-type'];
    if (!/^image\/(jpeg|png|webp)$/.test(tipo)) return json(res, 400, { erro: 'Envie JPG, PNG ou WEBP' });
    const id = await salvarImagem(tipo, await corpo(req, 6e6));
    json(res, 200, { url: '/img/' + id });
  },
};

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const rota = rotas[req.method + ' ' + url.pathname];
    if (rota) return await rota(req, res);
    if (req.method === 'GET' && url.pathname.startsWith('/img/')) {
      const img = await lerImagem(url.pathname.slice(5));
      if (!img) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': img.tipo, 'Cache-Control': 'public, max-age=31536000, immutable' }); return res.end(img.bytes);
    }
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    let p = url.pathname === '/' ? '/index.html' : url.pathname;
    if (p === '/admin') p = '/admin.html';
    const arq = path.normalize(path.join(PUB, p));
    if (!arq.startsWith(PUB) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Página não encontrada'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(arq).pipe(res);
  } catch (e) {
    console.error(e); if (!res.headersSent) json(res, 500, { erro: 'Erro no servidor' });
  }
});

iniciarBanco().then(() => servidor.listen(PORT, () => console.log('Rodando na porta ' + PORT + (db ? ' (Postgres)' : ' (arquivos locais)'))))
  .catch((e) => { console.error('Falha ao conectar no banco', e); process.exit(1); });
