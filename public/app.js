document.documentElement.classList.add('js');
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pega = (o, k) => k.split('.').reduce((a, b) => (a ? a[b] : undefined), o);
const paragrafos = (t) => String(t || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function img(el, url, cred, credEl) {
  if (!url) { el.closest('figure').hidden = true; return; }
  el.src = url; el.loading = 'lazy';
  el.onerror = () => { el.closest('figure').hidden = true; };
  if (credEl) credEl.textContent = cred || '';
}

function montar(c) {
  document.querySelectorAll('[data-c]').forEach((el) => { el.textContent = pega(c, el.dataset.c) ?? ''; });

  // título letra por letra
  const h1 = $('.hero h1');
  let n = 0;
  h1.innerHTML = String(c.hero.titulo || '').split(' ').map((pal) => `<span class="pal">${[...pal].map((ch) => `<span class="l" style="animation-delay:${0.15 + n++ * 0.045}s">${esc(ch)}</span>`).join('')}</span>`).join(' ');
  img($('#hero-img'), c.hero.imagem, c.hero.credito, $('#hero-cred'));
  $('#hero-img').loading = 'eager';

  // evento
  const d = c.evento.data ? new Date(c.evento.data) : null;
  if (d && !isNaN(d)) {
    $('#ev-data').textContent = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` + (d.getHours() || d.getMinutes() ? ` · ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}` : '');

  }
  $('#ev-aviso').textContent = c.evento.aviso || '';
  $('#prog').innerHTML = (c.programacao || []).map((p) => `<li class="rv${p.hora ? '' : ' sem-hora'}">${p.hora ? `<time>${esc(p.hora)}</time>` : ''}<div><h3>${esc(p.titulo)}</h3><p>${esc(p.descricao)}</p></div></li>`).join('');

  // origem
  img($('#origem-img'), c.origem.imagem, c.origem.credito, $('#origem-cred'));
  $('#origem-txt').innerHTML = paragrafos(c.origem.texto);
  $('#numeros').innerHTML = (c.numeros || []).map((n) => `<div class="rv"><b>${esc(n.valor)}</b><p>${esc(n.texto)}</p></div>`).join('');

  // linha do tempo
  $('#trilho').innerHTML = (c.linha || []).map((m) => `<article class="marco"><div class="ano">${esc(m.ano)}</div><h3>${esc(m.titulo)}</h3><p>${esc(m.texto)}</p>${m.imagem ? `<img src="${esc(m.imagem)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</article>`).join('');

  // pessoas
  $('#grade').innerHTML = (c.pessoas || []).map((p) => `<article class="pessoa rv"><div class="foto">${p.imagem ? `<img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" onerror="this.outerHTML='<div class=sem>${esc((p.nome || '?')[0])}</div>'">` : `<div class="sem">${esc((p.nome || '?')[0])}</div>`}</div><h3>${esc(p.nome)}</h3><small>${esc(p.papel)}</small><p>${esc(p.texto)}</p></article>`).join('');

  // cultura
  img($('#cultura-img'), c.cultura.imagem, c.cultura.credito, $('#cultura-cred'));
  $('#cultura-txt').innerHTML = paragrafos(c.cultura.texto);

  // poemas e galeria só aparecem se tiverem conteúdo
  const poemas = (c.poemas || []).filter((p) => p.texto);
  $('#poemas').hidden = !poemas.length;
  $('#lista-poemas').innerHTML = poemas.map((p) => `<div class="poema rv"><h3>${esc(p.titulo)}</h3><small>${esc(p.autor)}</small><p>${esc(p.texto)}</p></div>`).join('');
  const fotos = (c.galeria || []).filter((f) => f.imagem);
  $('#galeria').hidden = true;
  if (fotos.length) slides(fotos);

  revelar();
}

function slides(fotos) {
  const box = $('#slides'), pontos = $('#pontos'), leg = $('#slide-leg');
  $('#fotos-topo').hidden = false; $('#slide-ctrl').hidden = fotos.length < 2;
  box.innerHTML = fotos.map((f, i) => `<div class="slide" role="group" aria-label="Foto ${i + 1} de ${fotos.length}"><img src="${esc(f.imagem)}" alt="${esc(f.legenda || 'Foto da apresentação')}" ${i ? 'loading="lazy"' : ''}></div>`).join('');
  pontos.innerHTML = fotos.map((_, i) => `<i data-i="${i}" title="Foto ${i + 1}"></i>`).join('');
  const els = box.children; let atual = -1, timer;
  const ir = (n) => {
    n = (n + fotos.length) % fotos.length; if (n === atual) return;
    if (atual >= 0) { els[atual].classList.remove('on'); pontos.children[atual].classList.remove('on'); }
    atual = n; els[n].classList.add('on'); pontos.children[n].classList.add('on');
    leg.textContent = fotos[n].legenda || '';
    const prox = els[(n + 1) % fotos.length].querySelector('img'); prox.loading = 'eager';
  };
  const auto = () => { clearInterval(timer); timer = setInterval(() => ir(atual + 1), 5500); };
  $('#sl-prox').onclick = () => { ir(atual + 1); auto(); };
  $('#sl-ant').onclick = () => { ir(atual - 1); auto(); };
  pontos.onclick = (e) => { if (e.target.dataset.i) { ir(+e.target.dataset.i); auto(); } };
  // arrastar com o dedo
  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 45) { ir(atual + (dx < 0 ? 1 : -1)); auto(); } x0 = null; });
  addEventListener('keydown', (e) => { if (scrollY > innerHeight * 0.8) return; if (e.key === 'ArrowRight') { ir(atual + 1); auto(); } if (e.key === 'ArrowLeft') { ir(atual - 1); auto(); } });
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : auto()));
  ir(0); auto();
}

function relogio(alvo) {
  const el = $('#relogio');
  const tic = () => {
    const ms = alvo - new Date();
    if (ms <= 0) { el.className = 'relogio agora'; el.textContent = ms > -6 * 3600e3 ? 'Acontecendo agora' : 'Obrigado a todos!'; return; }
    const v = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
    el.innerHTML = ['dias', 'horas', 'min', 'seg'].map((r, i) => `<div><b>${String(v[i]).padStart(2, '0')}</b><small>${r}</small></div>`).join('');
  };
  tic(); setInterval(tic, 1000);
}

function revelar() {
  const els = document.querySelectorAll('.rv:not(.on)');
  if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('on'));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e, i) => { e.style.transitionDelay = (i % 4) * 0.08 + 's'; io.observe(e); });
  setTimeout(() => els.forEach((e) => e.classList.add('on')), 4000); // garantia: nada fica invisível
}

// topo muda de cor ao rolar
addEventListener('scroll', () => $('.topo').classList.toggle('solido', scrollY > innerHeight * 0.7), { passive: true });

// arrastar a linha do tempo com o mouse
(() => {
  const t = $('#trilho'); let x0, s0, ativo = false;
  t.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; ativo = true; x0 = e.clientX; s0 = t.scrollLeft; t.classList.add('arrastando'); });
  addEventListener('pointermove', (e) => { if (ativo) t.scrollLeft = s0 - (e.clientX - x0); });
  addEventListener('pointerup', () => { ativo = false; t.classList.remove('arrastando'); });
})();

fetch('/api/conteudo').then((r) => r.json()).then(montar).catch(() => { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:90px 24px">Não foi possível carregar o conteúdo. Recarregue a página.</p>'); });
