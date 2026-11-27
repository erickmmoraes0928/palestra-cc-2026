/* Motor da apresentação · 29º BPM · Colégio Central (v2 · 27/11/2026)
   Teclas: → ↓ espaço PageDown Enter = avança · ← ↑ PageUp Backspace = volta
           Home/End = primeiro/último · F = tela cheia · N = notas · B ou . = tela preta
   Slides com passo interno (1809→217 e sequências do COE/CPE): o primeiro “avança”
   adianta a animação até o fim; o seguinte vai para o próximo slide. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const ESTATICO = params.has('estatico');
  if (ESTATICO) document.documentElement.classList.add('estatico');
  if (params.has('semPendencias')) document.body.classList.add('sem-pendencias');

  const slides = Array.from(document.querySelectorAll('.slide'));
  const N = slides.length;
  const IMG = '../midia/img/';
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IO = 'cubic-bezier(0.77, 0, 0.175, 1)';
  let atual = -1;
  let inicioPalestra = null;
  let notas = null;
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- palco 1920×1080 escalado para a janela ---------- */
  function escala() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.documentElement.style.setProperty('--s', s);
  }
  addEventListener('resize', escala); escala();
  const escalaAtual = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;

  /* ---------- assinatura por faixa ---------- */
  slides.forEach(sl => {
    const f = sl.dataset.assin; if (!f) return;
    const d = document.createElement('div');
    if (f === 'preta') {
      d.className = 'assin so-brasao';
      d.innerHTML = `<img class="brasao" src="${IMG}brasao_branco.png" alt="">`;
    } else {
      const claro = f === 'claro';
      d.className = 'assin';
      d.innerHTML = `<img class="barra" src="${IMG}${claro ? 'barra_pmerj_marinho' : 'barra_pmerj_branca'}.png" alt="">` +
                    `<img class="brasao" src="${IMG}${claro ? 'brasao_colorido' : 'brasao_branco'}.png" alt="">`;
    }
    sl.appendChild(d);
  });

  /* ---------- manchete palavra a palavra (40–60 ms por palavra) ---------- */
  document.querySelectorAll('[data-palavras]').forEach(el => {
    const passo = +(el.dataset.passo || 50);
    let t = +(el.dataset.inicio || 60);
    const nos = Array.from(el.childNodes);
    el.textContent = '';
    nos.forEach(no => {
      if (no.nodeType === 3) {
        no.textContent.split(/(\s+)/).forEach(parte => {
          if (!parte) return;
          if (/^\s+$/.test(parte)) { el.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span');
          s.className = 'w'; s.textContent = parte; s.style.setProperty('--d', t + 'ms'); t += passo;
          el.appendChild(s);
        });
      } else if (no.nodeName === 'BR') {
        el.appendChild(no);
      } else {
        no.classList.add('w'); no.style.setProperty('--d', t + 'ms'); t += passo;
        el.appendChild(no);
      }
    });
  });

  /* ---------- linha do tempo: marcos acompanham o eixo ---------- */
  document.querySelectorAll('#linha .marco').forEach((m, i) => {
    const base = 300 + i * 850 + (m.classList.contains('hoje') ? 150 : 0);   // o eixo chega a cada marco a cada 850 ms
    m.querySelector('.bola').style.setProperty('--d', base + 'ms');
    m.querySelector('.ano').style.setProperty('--d', (base + 120) + 'ms');
    m.querySelector('.txt').style.setProperty('--d', (base + 280) + 'ms');
  });

  /* ---------- organogramas: a linha desce, o ramo sai e a caixa entra, um por um ---------- */
  function montaOrga(org) {
    const passo = +(org.dataset.passo || 150);
    let t = 520;
    const visita = ul => {
      const pai = ul.previousElementSibling;
      let antes = pai.offsetTop + pai.offsetHeight - ul.offsetTop + 8;
      Array.from(ul.children).forEach(li => {
        const no = li.querySelector(':scope > .no');
        let cx = li.querySelector(':scope > .cx'), tk = li.querySelector(':scope > .tk');
        if (!cx) { cx = document.createElement('i'); cx.className = 'cx'; li.prepend(cx); }
        if (!tk) { tk = document.createElement('i'); tk.className = 'tk'; li.prepend(tk); }
        const meio = no.offsetTop + no.offsetHeight / 2;
        const y = li.offsetTop + meio;
        const h = y - antes;
        cx.style.top = (antes - li.offsetTop) + 'px'; cx.style.height = (h + 1) + 'px';
        tk.style.top = (meio - 1) + 'px';
        const dur = Math.round(Math.min(420, 140 + h * 1.1));
        cx.style.setProperty('--d', t + 'ms'); cx.style.setProperty('--dur', dur + 'ms');
        tk.style.setProperty('--d', (t + dur - 40) + 'ms');
        no.dataset.a = 'dir'; no.style.setProperty('--d', (t + dur + 40) + 'ms');
        t += Math.max(passo, Math.round(dur * 0.7));
        antes = y;
        const sub = li.querySelector(':scope > ul'); if (sub) visita(sub);
      });
    };
    visita(org.querySelector(':scope > ul'));
  }
  const orgas = () => document.querySelectorAll('.orga').forEach(montaOrga);
  orgas();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(orgas);

  /* ---------- imagens já decodificadas antes de aparecer (evita engasgo no mosaico) ---------- */
  document.querySelectorAll('img').forEach(i => { i.decoding = 'async'; if (i.decode) i.decode().catch(() => {}); });

  /* ---------- temporizadores por slide ---------- */
  const timers = new Map();
  function limpaTimers(sl) { (timers.get(sl) || []).forEach(clearTimeout); timers.set(sl, []); }
  function depois(sl, ms, fn) { if (!timers.has(sl)) timers.set(sl, []); timers.get(sl).push(setTimeout(fn, ms)); }
  function cancelaAnims(el) { if (el) el.getAnimations({ subtree: true }).forEach(a => a.cancel()); }

  /* ---------- números que contam até o valor (≤ 1 s) ---------- */
  function contaAte(el, alvo, dur, sl) {
    if (ESTATICO || reduzido) { el.textContent = alvo; return; }
    const t0 = performance.now();
    el.textContent = '0';
    (function passo(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && sl.classList.contains('ativo')) requestAnimationFrame(passo);
      else el.textContent = alvo;
    })(t0);
  }
  function contar(sl) { sl.querySelectorAll('.conta').forEach(el => contaAte(el, +el.dataset.para, 900, sl)); }

  /* ---------- 1809 → sobe para o canto e entra 217 ---------- */
  function caixaTexto(el) {               // caixa do texto (não do bloco) em px do palco
    const r = document.createRange(); r.selectNodeContents(el);
    const b = r.getBoundingClientRect(), p = document.getElementById('palco').getBoundingClientRect(), s = escalaAtual();
    return { x: (b.left - p.left) / s, y: (b.top - p.top) / s, r: (b.right - p.left) / s };
  }
  const S_CANTO = 0.38;
  function destinoGrupo(g, x, y) {         // leva o texto do grupo para (x, y) do palco, em escala S_CANTO
    const S = S_CANTO;
    const kids = Array.from(g.children).map(caixaTexto);
    const gx = 0, gy = g.offsetTop;
    const minX = Math.min(...kids.map(k => k.x)) - gx, minY = Math.min(...kids.map(k => k.y)) - gy;
    return `translate(${x - gx - S * minX}px, ${y - gy - S * minY}px) scale(${S})`;
  }
  function destinoGrupoDir(g, xDir, y) {   // idem, alinhando a borda direita do texto em xDir
    const S = S_CANTO;
    const kids = Array.from(g.children).map(caixaTexto);
    const gy = g.offsetTop;
    const maxR = Math.max(...kids.map(k => k.r)), minY = Math.min(...kids.map(k => k.y)) - gy;
    return `translate(${xDir - S * maxR}px, ${y - gy - S * minY}px) scale(${S})`;
  }
  const destino1809 = sl => destinoGrupo(sl.querySelector('.g1809'), 110, 64);
  const destino217 = sl => destinoGrupoDir(sl.querySelector('.g217'), 1810, 64);
  function finalHist(sl) {
    const g1 = sl.querySelector('.g1809'), g2 = sl.querySelector('.g217');
    cancelaAnims(g1); cancelaAnims(g2); limpaTimers(sl);
    sl.querySelectorAll('.conta').forEach(el => el.textContent = el.dataset.para);
    g1.style.transform = ''; g2.style.transform = '';          // mede sem transformação
    g2.style.opacity = 1; sl.querySelector('.conta-217').textContent = '217';
    const a1 = destino1809(sl), a2 = destino217(sl);
    g1.style.transform = a1; g2.style.transform = a2;
    sl.querySelector('.frase-imp').classList.add('on');
    sl.__feito = true;
  }
  function entraHist(sl) {
    const g1 = sl.querySelector('.g1809'), g2 = sl.querySelector('.g217'), n = sl.querySelector('.conta-217');
    limpaTimers(sl); cancelaAnims(g1); cancelaAnims(g2);
    g1.style.transform = ''; g2.style.opacity = 0; g2.style.transform = ''; n.textContent = '0'; sl.__feito = false;
    sl.querySelector('.frase-imp').classList.remove('on');
    if (ESTATICO) { document.fonts.ready.then(() => finalHist(sl)); return; }
    depois(sl, 2100, () => {
      const alvo = destino1809(sl);
      g1.animate([{ transform: 'none' }, { transform: alvo }], { duration: reduzido ? 1 : 900, easing: EASE_IO, fill: 'forwards' })
        .finished.then(() => { g1.style.transform = alvo; cancelaAnims(g1); }).catch(() => {});
    });
    depois(sl, 2850, () => {
      g2.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: EASE_OUT, fill: 'forwards' });
      g2.style.opacity = 1;
      contaAte(n, 217, 1000, sl);
    });
    depois(sl, 2850 + 1000 + 700, () => {          // terminou o 217: ele também sobe
      const alvo = destino217(sl);
      g2.animate([{ transform: 'none' }, { transform: alvo }], { duration: reduzido ? 1 : 900, easing: EASE_IO, fill: 'forwards' })
        .finished.then(() => { g2.style.transform = alvo; cancelaAnims(g2); g2.style.opacity = 1; }).catch(() => {});
    });
    depois(sl, 2850 + 1000 + 700 + 950, () => {    // depois do deslocamento, a frase
      sl.querySelector('.frase-imp').classList.add('on');
      sl.__feito = true;
    });
  }
  function saiHist(sl) {
    limpaTimers(sl);
    setTimeout(() => { if (!sl.classList.contains('ativo')) { const g1 = sl.querySelector('.g1809'), g2 = sl.querySelector('.g217'); cancelaAnims(g1); cancelaAnims(g2); g1.style.transform = ''; g2.style.opacity = 0; g2.style.transform = ''; sl.querySelector('.frase-imp').classList.remove('on'); } }, 500);
  }

  /* ---------- unidades: uma por quadro, depois o mosaico se monta ---------- */
  function resetUnidades(sl) {
    limpaTimers(sl);
    sl.querySelectorAll('.q').forEach(q => q.classList.remove('on'));
    const m = sl.querySelector('.mosaico'); m.classList.remove('on', 'titulo'); cancelaAnims(m);
    sl.__montado = false;
  }
  function entraUnidades(sl) {
    resetUnidades(sl);
    if (ESTATICO) { sl.__montado = true; return; }
    const qs = Array.from(sl.querySelectorAll('.q'));
    if (!qs.length) { depois(sl, 200, () => montar(sl)); return; }
    qs.forEach((q, i) => depois(sl, 350 + i * 1700, () => qs.forEach((x, k) => x.classList.toggle('on', k === i))));
    depois(sl, 350 + qs.length * 1700, () => montar(sl));
  }
  function montar(sl) {
    if (sl.__montado) return;
    sl.__montado = true; limpaTimers(sl);
    const tinhaSeq = !!sl.querySelector('.q.on');
    sl.querySelectorAll('.q').forEach(q => q.classList.remove('on'));
    const m = sl.querySelector('.mosaico'); m.classList.add('on'); sl.classList.add('montando');
    setTimeout(() => sl.classList.remove('montando'), 3200);
    const grade = m.querySelector('.grade'), tiles = Array.from(m.querySelectorAll('.t'));
    const cab = m.querySelector('.cab'), cols = Array.from(m.querySelectorAll('.col-t')), caps = Array.from(m.querySelectorAll('figcaption'));
    const atraso = tinhaSeq ? 200 : 0;            // deixa o último quadro sumir antes
    const op = (el, d, dur, de) => el.animate([{ opacity: 0, transform: de || 'none' }, { opacity: 1, transform: 'none' }], { duration: dur, easing: EASE_OUT, fill: 'both', delay: d });
    if (reduzido) { op(grade, atraso, 300); m.classList.add('titulo'); return; }
    // ordem radial: do centro do mosaico para fora
    const gr = grade.getBoundingClientRect(), cx = gr.left + gr.width / 2, cy = gr.top + gr.height / 2;
    const ordem = tiles.map(t => { const r = t.getBoundingClientRect(); return { t, d: Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) }; })
                       .sort((a, b) => a.d - b.d);
    // a “câmera” recua devagar enquanto as peças assentam
    grade.animate([{ transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 1700, easing: EASE_OUT, fill: 'both', delay: atraso });
    ordem.forEach(({ t }, k) => {
      const d = atraso + k * 90;
      op(t, d, 900, 'translateY(40px) scale(0.92)');
      t.querySelector('img').animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 1600, easing: EASE_OUT, fill: 'both', delay: d });
    });
    const fim = atraso + tiles.length * 90 + 450;
    caps.forEach((c, k) => op(c, fim + k * 45, 420, 'translateY(10px)'));
    cols.forEach((c, k) => op(c, atraso + 150 + k * 140, 450, 'translateY(12px)'));
    // nome do comando: classe + transição CSS (não depende do preenchimento da animação em JS)
    if (cab) depois(sl, fim - 100, () => m.classList.add('titulo'));
  }

  /* ---------- vídeo: começa sozinho, para e volta ao início ao sair ---------- */
  function entraVideo(sl) {
    const v = sl.querySelector('video'); if (!v || ESTATICO) return;
    try { v.currentTime = 0; } catch (e) {}
    const p = v.play();
    if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); console.warn('autoplay com som bloqueado; tocando sem som', v.src); });
  }
  function saiVideo(sl) {
    const v = sl.querySelector('video'); if (!v) return;
    v.pause(); if (sl.id !== 'capa') { try { v.currentTime = 0; } catch (e) {} }
  }

  /* ---------- navegação ---------- */
  function ir(n, origem) {
    n = Math.max(0, Math.min(N - 1, n));
    if (n === atual) return;
    if (atual >= 0 && inicioPalestra === null && origem !== 'hash') inicioPalestra = Date.now();
    const antes = slides[atual];
    if (antes) {
      antes.classList.remove('ativo');
      saiVideo(antes);
      if (antes.classList.contains('unidades')) setTimeout(() => { if (!antes.classList.contains('ativo')) resetUnidades(antes); }, 500);
      if (antes.id === 'hist') saiHist(antes);
    }
    atual = n;
    const sl = slides[n];
    void sl.offsetWidth;
    sl.classList.add('ativo');
    entraVideo(sl);
    contar(sl);
    if (sl.classList.contains('unidades')) entraUnidades(sl);
    if (sl.id === 'hist') entraHist(sl);
    if (location.hash !== '#' + (n + 1)) history.replaceState(null, '', '#' + (n + 1));
    atualizaNotas(true);
  }
  function prox() {
    const sl = slides[atual];
    if (sl && sl.classList.contains('unidades') && !sl.__montado) { montar(sl); return; }
    if (sl && sl.id === 'hist' && !sl.__feito) { finalHist(sl); return; }
    ir(atual + 1);
  }
  const ant = () => ir(atual - 1);

  function telaCheia() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }
  function telaPreta() { document.body.classList.toggle('preto'); }

  function tecla(e) {
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); prox(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); ant(); }
    else if (k === 'Home') { e.preventDefault(); ir(0); }
    else if (k === 'End') { e.preventDefault(); ir(N - 1); }
    else if (k === 'f' || k === 'F') telaCheia();
    else if (k === 'b' || k === 'B' || k === '.') telaPreta();
    else if (k === 'n' || k === 'N') abreNotas();
  }
  addEventListener('keydown', tecla);

  let cursorT = null;
  addEventListener('mousemove', () => {
    document.body.classList.add('mostra-cursor');
    clearTimeout(cursorT); cursorT = setTimeout(() => document.body.classList.remove('mostra-cursor'), 2000);
  });
  addEventListener('hashchange', () => { const h = parseInt(location.hash.slice(1), 10); if (h) ir(h - 1, 'hash'); });

  /* ---------- janela de notas do apresentador (N) ---------- */
  const titulo = i => slides[i] ? slides[i].dataset.titulo : '';
  const pad = n => String(n).padStart(2, '0');
  const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
  let entrouEm = Date.now();

  function abreNotas() {
    if (notas && !notas.closed) { notas.focus(); return; }
    notas = window.open('', 'notas29bpm', 'width=1280,height=820');
    if (!notas) { alert('O navegador bloqueou a janela de notas. Permita pop-ups para esta página e tente de novo.'); return; }
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    notas.document.open();
    notas.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${base}">
<title>Notas · Palestra 29º BPM</title><link rel="stylesheet" href="fonts.css"><style>
*{box-sizing:border-box}body{margin:0;font-family:Poppins,sans-serif;background:#0b1422;color:#F2F4F5;display:grid;grid-template-columns:1fr 420px;grid-template-rows:auto 1fr;height:100vh}
header{grid-column:1/3;display:flex;align-items:center;gap:28px;padding:16px 28px;background:#00549C}
header .n{font-weight:700;font-size:34px}header .t{font-weight:600;font-size:26px;flex:1}
header .rel{font-weight:600;font-size:34px;font-variant-numeric:tabular-nums}header .rel small{display:block;font-size:13px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
button{font:600 15px Poppins;background:#fff;color:#00549C;border:0;border-radius:8px;padding:8px 14px;cursor:pointer}
main{padding:28px 34px;overflow:auto}main .fala{font-size:30px;line-height:1.45;white-space:pre-wrap}
.espera{margin-top:24px;font-size:28px;font-weight:700;color:#D8B048}
aside{padding:28px 24px;border-left:1px solid #22324a;display:flex;flex-direction:column;gap:12px}
aside .rot{font-size:13px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;font-weight:600}
aside img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#142033;border-radius:6px}
aside .pt{font-weight:600;font-size:20px}.dica{margin-top:auto;font-size:13px;opacity:.6;line-height:1.5}
.nav{display:flex;gap:8px}</style></head><body>
<header><div class="n" id="n"></div><div class="t" id="t"></div>
<div class="rel"><small>Neste slide</small><span id="ns">00:00</span></div>
<div class="rel"><small>Palestra</small><span id="tp">00:00</span></div>
<div class="rel"><small>Hora</small><span id="hr"></span></div><button id="zera">Zerar</button></header>
<main><div class="fala" id="fala"></div><div class="espera" id="espera"></div></main>
<aside><div class="rot">Próximo slide</div><img id="pi" alt=""><div class="pt" id="pt"></div>
<div class="nav"><button id="bv">◀ Voltar</button><button id="ba">Avançar ▶</button></div>
<div class="dica">Teclas também funcionam nesta janela.<br>→ avança · ← volta · B tela preta · F tela cheia (na janela principal)</div></aside></body></html>`);
    notas.document.close();
    notas.addEventListener('keydown', e => { if (e.key !== 'f' && e.key !== 'F') tecla(e); });
    notas.document.getElementById('zera').onclick = () => { inicioPalestra = Date.now(); atualizaNotas(); };
    notas.document.getElementById('ba').onclick = prox;
    notas.document.getElementById('bv').onclick = ant;
    atualizaNotas(true);
  }

  function atualizaNotas(trocou) {
    if (trocou) entrouEm = Date.now();
    if (!notas || notas.closed) return;
    const d = notas.document, $ = id => d.getElementById(id);
    if (!$('n') || !trocou) return;
    $('n').textContent = `${atual + 1}/${N}`;
    $('t').textContent = titulo(atual);
    $('fala').textContent = (window.FALAS || {})[slides[atual].id] || '';
    const p = atual + 1 < N ? atual + 1 : null;
    $('pt').textContent = p !== null ? `${p + 1} · ${titulo(p)}` : 'Fim';
    const img = $('pi');
    if (p !== null) { img.style.visibility = 'visible'; img.onerror = () => { img.style.visibility = 'hidden'; }; img.src = `../folha/slides/s${pad(p + 1)}.png`; }
    else img.style.visibility = 'hidden';
  }
  setInterval(() => {
    if (!notas || notas.closed) return;
    const d = notas.document, $ = id => d.getElementById(id); if (!$('ns')) return;
    const agora = Date.now();
    $('ns').textContent = fmt(agora - entrouEm);
    $('tp').textContent = inicioPalestra ? fmt(agora - inicioPalestra) : '00:00';
    $('hr').textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const sl = slides[atual];
    $('espera').textContent = sl && sl.id === 'instagram' ? `Espera do QR: ${Math.max(0, 20 - Math.floor((agora - entrouEm) / 1000))} s` : '';
  }, 250);

  /* ---------- início ---------- */
  const h = parseInt(location.hash.slice(1), 10);
  if (ESTATICO) slides.forEach(s => s.style.transition = 'none');
  ir(h ? h - 1 : 0, 'hash');
  window.__apresentacao = { ir, prox, ant, get atual() { return atual; }, N };
})();
