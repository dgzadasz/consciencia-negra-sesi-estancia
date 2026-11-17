const $ = (s, r = document) => r.querySelector(s);
const h = (tag, props = {}, ...filhos) => { const e = document.createElement(tag); Object.assign(e, props); filhos.flat().forEach((f) => f != null && e.append(f)); return e; };
let dados = null, sujo = false, abaAtual = 'apresentacao';

// ---------- definição do painel ----------
const ABAS = [
  { id: 'apresentacao', nome: 'Apresentação e horários', ajuda: 'Coloque a data e os horários quando souber. Se ainda não souber um horário, deixe "--:--".', campos: [
    { k: 'evento.titulo', r: 'Título da seção' },
    { k: 'evento.data', r: 'Data e hora de início (usada na contagem regressiva)', t: 'data' },
    { k: 'evento.local', r: 'Local' },
    { k: 'evento.texto', r: 'Texto', t: 'area' },
    { k: 'evento.aviso', r: 'Aviso acima da programação', d: 'Ex.: "Horários a confirmar". Deixe vazio para esconder.' },
    { k: 'programacao', r: 'Programação', t: 'lista', item: 'Atividade', novo: { hora: '--:--', titulo: '', descricao: '' }, campos: [
      { k: 'hora', r: 'Horário', d: 'Ex.: 08:30' }, { k: 'titulo', r: 'Atividade' }, { k: 'descricao', r: 'Descrição', t: 'area' }] },
  ] },
  { id: 'textos', nome: 'Textos e capa', campos: [
    { k: 'hero.chamada', r: 'Frase pequena da capa' },
    { k: 'hero.titulo', r: 'Título da capa' },
    { k: 'hero.texto', r: 'Texto da capa', t: 'area' },
    { k: 'hero.imagem', r: 'Foto da capa', t: 'img' },
    { k: 'hero.credito', r: 'Crédito da foto da capa' },
    { k: 'origem.titulo', r: 'Título — origem da data' },
    { k: 'origem.texto', r: 'Texto — origem da data', t: 'area', d: 'Deixe uma linha em branco para separar parágrafos.' },
    { k: 'origem.imagem', r: 'Imagem — origem', t: 'img' },
    { k: 'origem.credito', r: 'Crédito da imagem — origem' },
    { k: 'numeros', r: 'Números em destaque', t: 'lista', item: 'Número', novo: { valor: '', texto: '' }, campos: [{ k: 'valor', r: 'Número' }, { k: 'texto', r: 'Explicação' }] },
    { k: 'cultura.titulo', r: 'Título — cultura' },
    { k: 'cultura.texto', r: 'Texto — cultura', t: 'area' },
    { k: 'cultura.imagem', r: 'Imagem — cultura', t: 'img' },
    { k: 'cultura.credito', r: 'Crédito da imagem — cultura' },
  ] },
  { id: 'linha', nome: 'Linha do tempo', campos: [
    { k: 'linha', r: 'Marcos', t: 'lista', item: 'Marco', novo: { ano: '', titulo: '', texto: '', imagem: '' }, campos: [
      { k: 'ano', r: 'Ano' }, { k: 'titulo', r: 'Título' }, { k: 'texto', r: 'Texto', t: 'area' }, { k: 'imagem', r: 'Imagem (opcional)', t: 'img' }] },
  ] },
  { id: 'pessoas', nome: 'Pessoas', campos: [
    { k: 'pessoas', r: 'Personalidades', t: 'lista', item: 'Pessoa', novo: { nome: '', papel: '', texto: '', imagem: '' }, campos: [
      { k: 'nome', r: 'Nome' }, { k: 'papel', r: 'O que fez / anos' }, { k: 'texto', r: 'Texto', t: 'area' }, { k: 'imagem', r: 'Foto', t: 'img' }] },
  ] },
  { id: 'poemas', nome: 'Poemas', ajuda: 'A seção de poemas só aparece no site quando houver pelo menos um poema.', campos: [
    { k: 'poemas', r: 'Poemas', t: 'lista', item: 'Poema', novo: { titulo: '', autor: '', texto: '' }, campos: [
      { k: 'titulo', r: 'Título' }, { k: 'autor', r: 'Autor(a) / quem vai ler' }, { k: 'texto', r: 'Poema', t: 'area' }] },
  ] },
  { id: 'galeria', nome: 'Fotos', ajuda: 'Coloque aqui as fotos do dia da apresentação. A seção só aparece quando houver fotos.', campos: [
    { k: 'galeria', r: 'Fotos', t: 'lista', item: 'Foto', novo: { imagem: '', legenda: '' }, campos: [{ k: 'imagem', r: 'Foto', t: 'img' }, { k: 'legenda', r: 'Legenda' }] },
  ] },
  { id: 'geral', nome: 'Créditos', campos: [
    { k: 'escola', r: 'Escola' }, { k: 'turma', r: 'Turma' }, { k: 'autores', r: 'Feito por' }, { k: 'rodape', r: 'Texto do rodapé', t: 'area' },
  ] },
  { id: 'qr', nome: 'QR Code (só equipe)', especial: true },
];

const pega = (o, k) => k.split('.').reduce((a, b) => (a == null ? undefined : a[b]), o);
const poe = (o, k, v) => { const p = k.split('.'); const u = p.pop(); p.reduce((a, b) => (a[b] ??= {}), o)[u] = v; };
const marcaSujo = () => { sujo = true; $('#salvar').classList.add('sujo'); $('#status').textContent = 'Alterações não salvas'; };

// ---------- campos ----------
function campo(obj, def) {
  const id = 'c' + Math.random().toString(36).slice(2);
  const v = pega(obj, def.k);
  const wrap = h('div', { className: 'campo' }, h('label', { htmlFor: id, textContent: def.r }));
  if (def.t === 'lista') return lista(obj, def);
  if (def.t === 'img') wrap.append(campoImg(obj, def, id));
  else if (def.t === 'area') { const t = h('textarea', { id, value: v ?? '' }); t.oninput = () => { poe(obj, def.k, t.value); marcaSujo(); }; wrap.append(t); }
  else if (def.t === 'data') { const t = h('input', { id, type: 'datetime-local', value: v ?? '' }); t.oninput = () => { poe(obj, def.k, t.value); marcaSujo(); }; wrap.append(t); }
  else { const t = h('input', { id, type: 'text', value: v ?? '' }); t.oninput = () => { poe(obj, def.k, t.value); marcaSujo(); }; wrap.append(t); }
  if (def.d) wrap.append(h('small', { textContent: def.d }));
  return wrap;
}

function campoImg(obj, def, id) {
  const prev = h('img', { className: 'prev', alt: '' });
  const url = h('input', { id, type: 'text', placeholder: 'Link da imagem ou envie um arquivo', value: pega(obj, def.k) || '' });
  const arq = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const st = h('small');
  const mostra = () => { prev.src = url.value || ''; prev.style.visibility = url.value ? 'visible' : 'hidden'; };
  url.oninput = () => { poe(obj, def.k, url.value.trim()); mostra(); marcaSujo(); };
  arq.onchange = async () => {
    const f = arq.files[0]; if (!f) return;
    st.textContent = 'Enviando…';
    try {
      const blob = await reduzir(f);
      const r = await fetch('/api/imagem', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
      const j = await r.json(); if (!r.ok) throw new Error(j.erro);
      url.value = j.url; url.oninput(); st.textContent = 'Imagem enviada. Lembre de salvar.';
    } catch (e) { st.textContent = 'Erro ao enviar: ' + e.message; }
    arq.value = '';
  };
  mostra();
  return h('div', { className: 'imgcampo' }, prev, h('div', { className: 'lado' }, url,
    h('div', { className: 'acoes' }, h('button', { className: 'bt sec mini', type: 'button', textContent: 'Enviar foto do computador/celular', onclick: () => arq.click() }),
      h('button', { className: 'bt sec mini perigo', type: 'button', textContent: 'Remover', onclick: () => { url.value = ''; url.oninput(); } })), st, arq));
}

// reduz a foto para no máximo 1600px antes de enviar
function reduzir(f) {
  return new Promise((ok, erro) => {
    const i = new Image(); i.onerror = () => erro(new Error('arquivo não é imagem'));
    i.onload = () => {
      const k = Math.min(1, 1600 / Math.max(i.width, i.height));
      const c = h('canvas', { width: Math.round(i.width * k), height: Math.round(i.height * k) });
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? ok(b) : erro(new Error('falha ao converter'))), 'image/jpeg', 0.85);
      URL.revokeObjectURL(i.src);
    };
    i.src = URL.createObjectURL(f);
  });
}

function lista(obj, def) {
  if (!Array.isArray(pega(obj, def.k))) poe(obj, def.k, []);
  const arr = pega(obj, def.k);
  const box = h('div', { className: 'campo' }, h('label', { textContent: def.r }));
  const desenha = () => {
    box.querySelectorAll('.item,.add').forEach((e) => e.remove());
    arr.forEach((it, i) => {
      const mover = (d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; marcaSujo(); desenha(); };
      box.append(h('div', { className: 'item' },
        h('div', { className: 'item-cab' }, h('b', { textContent: `${def.item} ${i + 1}` }),
          h('button', { className: 'bt sec mini', type: 'button', textContent: '↑', title: 'Subir', onclick: () => mover(-1) }),
          h('button', { className: 'bt sec mini', type: 'button', textContent: '↓', title: 'Descer', onclick: () => mover(1) }),
          h('button', { className: 'bt sec mini perigo', type: 'button', textContent: 'Excluir', onclick: () => { if (confirm(`Excluir ${def.item.toLowerCase()} ${i + 1}?`)) { arr.splice(i, 1); marcaSujo(); desenha(); } } })),
        def.campos.map((c) => campo(it, c))));
    });
    box.append(h('button', { className: 'bt sec add', type: 'button', textContent: '+ Adicionar ' + def.item.toLowerCase(), onclick: () => { arr.push(structuredClone(def.novo)); marcaSujo(); desenha(); } }));
  };
  desenha();
  return box;
}

// ---------- abas ----------
function abrir(id) {
  abaAtual = id;
  document.querySelectorAll('.abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.id === id));
  const aba = ABAS.find((a) => a.id === id);
  const m = $('#conteudo'); m.innerHTML = '';
  $('#salvar').hidden = !!aba.especial;
  if (aba.especial) return telaQR(m);
  if (aba.ajuda) m.append(h('p', { className: 'ajuda', textContent: aba.ajuda }));
  aba.campos.forEach((c) => m.append(campo(dados, c)));
}

async function salvar() {
  const b = $('#salvar'); b.disabled = true; b.textContent = 'Salvando…';
  try {
    const r = await fetch('/api/conteudo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
    if (r.status === 401) { alert('Sua sessão expirou. Entre de novo (suas alterações continuam nesta tela).'); return mostrarLogin(); }
    if (!r.ok) throw new Error((await r.json()).erro);
    sujo = false; b.classList.remove('sujo'); $('#status').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { alert('Não foi possível salvar: ' + e.message); }
  finally { b.disabled = false; b.textContent = 'Salvar alterações'; }
}

// ---------- QR Code com banner ----------
function telaQR(m) {
  const link = h('input', { type: 'text', value: location.origin });
  const cv = h('canvas', { id: 'qrcanvas', width: 1080, height: 1350 });
  m.append(h('p', { className: 'ajuda', textContent: 'Este banner é só para a equipe: ele não aparece no site. Baixe e coloque no slide ou imprima. Teste lendo com o celular antes.' }),
    h('div', { className: 'campo' }, h('label', { textContent: 'Link do QR Code' }), link, h('small', { textContent: 'Já vem com o endereço deste site.' })),
    cv,
    h('button', { className: 'bt', textContent: 'Baixar banner (PNG)', onclick: () => { const a = h('a', { download: 'qrcode-consciencia-negra.png', href: cv.toDataURL('image/png') }); a.click(); } }));
  const logo = new Image(); logo.src = '/sesi.png';
  const draw = () => banner(cv, link.value.trim() || location.origin, logo);
  link.oninput = draw; logo.onload = draw; logo.onerror = draw; draw();
}

function banner(c, LINK, logo) {
  const x = c.getContext('2d'), W = 1080, H = 1350, V = '#b4432b', O = '#d6981f', G = '#1f5a3c', CR = '#f3ede3', T = '#17120e';
  const rr = (a, b, w, hh, r) => { x.beginPath(); x.roundRect(a, b, w, hh, r); };
  x.fillStyle = T; x.fillRect(0, 0, W, H);
  // faixa de tecido em cima e embaixo
  const faixa = (y) => { const cols = [V, O, T, G, O]; const ws = [36, 12, 36, 36, 12]; let px = 0, i = 0; while (px < W) { x.fillStyle = cols[i % 5]; x.fillRect(px, y, ws[i % 5], 40); px += ws[i % 5]; i++; } };
  faixa(0); faixa(H - 40);
  const d = dados.evento?.data ? new Date(dados.evento.data) : null;
  const MES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  x.textAlign = 'center';
  x.fillStyle = O; x.font = '600 28px Arial'; x.fillText('20 DE NOVEMBRO · DIA NACIONAL DE ZUMBI E DA', W / 2, 115);
  x.fillStyle = CR; x.font = '800 108px Georgia'; x.fillText('Consciência Negra', W / 2, 225);
  x.fillStyle = O; x.fillRect(W / 2 - 60, 252, 120, 4);
  // QR
  const S = 660, qx = (W - S) / 2, qy = 300;
  x.fillStyle = O; rr(qx - 14, qy - 14, S + 28, S + 28, 30); x.fill();
  x.fillStyle = CR; rr(qx, qy, S, S, 22); x.fill();
  const q = qrcode(0, 'H'); q.addData(LINK); q.make();
  const n = q.getModuleCount(), pad = 44, mm = (S - pad * 2) / n;
  const fin = (r, k) => (r < 7 && k < 7) || (r < 7 && k >= n - 7) || (r >= n - 7 && k < 7);
  const bw = mm * Math.round(n * 0.36), bh = mm * Math.round(n * 0.22), bx = qx + S / 2 - bw / 2, by = qy + S / 2 - bh / 2;
  x.fillStyle = T;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
    if (!q.isDark(r, k) || fin(r, k)) continue;
    const px = qx + pad + k * mm, py = qy + pad + r * mm;
    if (px + mm > bx - 4 && px < bx + bw + 4 && py + mm > by - 4 && py < by + bh + 4) continue;
    rr(px + mm * 0.06, py + mm * 0.06, mm * 0.88, mm * 0.88, mm * 0.3); x.fill();
  }
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, k], i) => {
    const px = qx + pad + k * mm, py = qy + pad + r * mm;
    x.fillStyle = T; rr(px, py, 7 * mm, 7 * mm, mm * 1.6); x.fill();
    x.fillStyle = CR; rr(px + mm, py + mm, 5 * mm, 5 * mm, mm * 1.1); x.fill();
    x.fillStyle = [V, G, O][i]; rr(px + 2 * mm, py + 2 * mm, 3 * mm, 3 * mm, mm * 0.8); x.fill();
  });
  x.fillStyle = '#fff'; rr(bx, by, bw, bh, 14); x.fill(); x.lineWidth = 4; x.strokeStyle = O; x.stroke();
  if (logo.complete && logo.naturalWidth) { const sw = logo.naturalWidth * 0.615, sh = logo.naturalHeight, k = Math.min((bw - 28) / sw, (bh - 28) / sh); x.drawImage(logo, 0, 0, sw, sh, qx + S / 2 - sw * k / 2, qy + S / 2 - sh * k / 2, sw * k, sh * k); }
  // textos de baixo
  const y = qy + S + 82;
  x.fillStyle = CR; x.font = '700 38px Arial'; x.fillText('Aponte a câmera e conheça o projeto', W / 2, y);
  if (d && !isNaN(d)) { x.fillStyle = V; x.font = '700 30px Arial'; const t = `APRESENTAÇÃO · ${d.getDate()} DE ${MES[d.getMonth()]} DE ${d.getFullYear()}`; const w = x.measureText(t).width + 70; rr(W / 2 - w / 2, y + 28, w, 60, 30); x.fill(); x.fillStyle = '#fff'; x.fillText(t, W / 2, y + 69); }
  x.fillStyle = O; x.font = '700 30px Arial'; x.fillText((dados.escola || '').toUpperCase(), W / 2, y + 140);
  x.fillStyle = '#b9ad9c'; x.font = '24px Arial'; x.fillText(`${dados.autores || ''} · ${dados.turma || ''}`, W / 2, y + 178);
}

// ---------- login ----------
function mostrarLogin() { $('#tela-login').hidden = false; $('#tela-painel').hidden = true; $('#senha').focus(); }
async function mostrarPainel() {
  if (!dados) dados = await (await fetch('/api/conteudo')).json();
  $('#tela-login').hidden = true; $('#tela-painel').hidden = false;
  $('#abas').innerHTML = '';
  ABAS.forEach((a) => { const b = h('button', { textContent: a.nome, onclick: () => abrir(a.id) }); b.dataset.id = a.id; $('#abas').append(b); });
  abrir(abaAtual);
}
$('#f-login').onsubmit = async (e) => {
  e.preventDefault(); $('#erro-login').textContent = '';
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: $('#senha').value }) });
  if (r.ok) { $('#senha').value = ''; mostrarPainel(); } else $('#erro-login').textContent = (await r.json()).erro;
};
$('#sair').onclick = async () => { if (sujo && !confirm('Há alterações não salvas. Sair mesmo assim?')) return; await fetch('/api/sair', { method: 'POST' }); location.reload(); };
$('#salvar').onclick = salvar;
addEventListener('beforeunload', (e) => { if (sujo) e.preventDefault(); });
fetch('/api/sessao').then((r) => r.json()).then((s) => (s.logado ? mostrarPainel() : mostrarLogin()));
