/*!
 * ABREV — Pop-up "Faça parte da comunidade" (componente único, sem dependências)
 * Inclua em qualquer página:  <script src="/assets/comunidade-popup.js" defer></script>
 * Envia action:"community" para o Apps Script (lista Comunidade → E1).
 * Abre após ~12s (1x por sessão; nunca depois de cadastrar) ou via ?comunidade=1.
 */
(function () {
  if (window.__abrevComunidade) return;
  window.__abrevComunidade = true;

  var EXEC = 'https://script.google.com/macros/s/AKfycbyJPKHIzLvghLIkJpORZd7vYTGiDzSY_ybiAdnub3CX4bLLzPx5O-eTDc0hxpRc9DjIDw/exec';
  var FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdZ5Y8wrXJ5MAdm2k3H5aAuLIxSiZLFo-mY046BQttft3wraQ/viewform';
  var PRIV = '/politica-privacidade.html';
  var DONE = 'abrev_comunidade_done', SHOWN = 'abrev_comunidade_shown';
  var DELAY = 12000;

  function ls(get, key, val) { try { return get ? localStorage.getItem(key) : localStorage.setItem(key, val); } catch (e) { return null; } }
  function ss(get, key, val) { try { return get ? sessionStorage.getItem(key) : sessionStorage.setItem(key, val); } catch (e) { return null; } }

  var CSS = [
    '.abrevcm-ov{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(7,26,37,.55);backdrop-filter:blur(3px);font-family:Inter,Arial,Helvetica,sans-serif}',
    '.abrevcm-ov.show{display:flex}',
    '.abrevcm-card{position:relative;width:100%;max-width:440px;background:#fff;border-radius:20px;padding:34px 30px;box-shadow:0 30px 80px rgba(7,26,37,.35);animation:abrevcm-in .25s ease}',
    '@keyframes abrevcm-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '.abrevcm-x{position:absolute;top:14px;right:16px;border:0;background:none;font-size:26px;line-height:1;color:#8a97a0;cursor:pointer}',
    '.abrevcm-pill{display:inline-block;background:rgba(12,162,166,.12);color:#0ca2a6;font:700 .68rem/1 Inter,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:7px 12px;border-radius:999px}',
    '.abrevcm-card h3{font:800 1.5rem/1.15 Montserrat,Inter,Arial,sans-serif;color:#153244;margin:14px 0 8px}',
    '.abrevcm-card p.abrevcm-sub{color:#607581;font-size:.98rem;line-height:1.5;margin:0 0 18px}',
    '.abrevcm-form{display:flex;flex-direction:column;gap:11px}',
    '.abrevcm-form input{padding:13px 15px;border:1px solid #e5eaed;border-radius:12px;font:inherit;background:#fff;color:#153244}',
    '.abrevcm-form input:focus{outline:2px solid #0ca2a6;border-color:#0ca2a6}',
    '.abrevcm-form button{margin-top:2px;background:#153244;color:#fff;border:0;cursor:pointer;padding:14px 18px;border-radius:999px;font:800 .95rem Montserrat,Inter,Arial,sans-serif;transition:.2s}',
    '.abrevcm-form button:hover{background:#0ca2a6}',
    '.abrevcm-note{font-size:.78rem;color:#8a97a0;line-height:1.5;margin:12px 0 0;text-align:center}',
    '.abrevcm-note a{color:#0ca2a6}',
    '.abrevcm-status{font-size:.85rem;color:#c0392b;margin:2px 0 0;min-height:1em}',
    '.abrevcm-ok{color:#153244;font-weight:700;text-align:center;margin:6px 0 0}'
  ].join('');

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.className = 'abrevcm-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Faça parte da comunidade ABREV');
    ov.innerHTML =
      '<div class="abrevcm-card">' +
        '<button class="abrevcm-x" type="button" aria-label="Fechar">×</button>' +
        '<span class="abrevcm-pill">Comunidade ABREV</span>' +
        '<h3>Faça parte da comunidade</h3>' +
        '<p class="abrevcm-sub">Receba, a cada 15 dias, os artigos da ABREV — além de pesquisas, estudos e convites para eventos sobre logística reversa no varejo.</p>' +
        '<form class="abrevcm-form" novalidate>' +
          '<input type="text" name="nome" placeholder="Seu nome" aria-label="Seu nome" autocomplete="name" required>' +
          '<input type="email" name="email" placeholder="E-mail" aria-label="E-mail" autocomplete="email" required>' +
          '<input type="tel" name="telefone" placeholder="Telefone / WhatsApp (opcional)" aria-label="Telefone (opcional)" autocomplete="tel" inputmode="tel">' +
          '<button type="submit">Quero fazer parte</button>' +
          '<p class="abrevcm-status" role="status" aria-live="polite"></p>' +
        '</form>' +
        '<p class="abrevcm-note">Ao se cadastrar, você concorda com nossa <a href="' + PRIV + '" target="_blank" rel="noopener">Política de Privacidade</a>. Quer atuar de fato na ABREV? <a href="' + FORM + '" target="_blank" rel="noopener">Associe-se →</a></p>' +
      '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  function init() {
    var ov = build();
    var card = ov.querySelector('.abrevcm-card');
    var form = ov.querySelector('.abrevcm-form');
    var status = ov.querySelector('.abrevcm-status');
    var xBtn = ov.querySelector('.abrevcm-x');

    function open() { ov.classList.add('show'); document.body.style.overflow = 'hidden'; }
    function close() { ov.classList.remove('show'); document.body.style.overflow = ''; }
    xBtn.addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('show')) close(); });

    var done = ls(true, DONE) === '1';
    var shown = ss(true, SHOWN) === '1';
    if (/[?&]comunidade=1/.test(location.search)) { open(); }
    else if (!done && !shown) {
      setTimeout(function () {
        if (!ov.classList.contains('show')) { open(); ss(false, SHOWN, '1'); }
      }, DELAY);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var email = form.email.value.trim();
      if (!email) { status.textContent = 'Informe um e-mail válido.'; return; }
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Enviando…'; status.textContent = '';
      var tel = form.telefone.value.trim();
      var payload = {
        action: 'community',
        nome: form.nome.value.trim(),
        email: email,
        telefone: tel ? ('[' + origemTag() + '] ' + tel) : '',
        origem: 'popup_' + origemTag().toLowerCase()
      };
      fetch(EXEC, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function () {
          ls(false, DONE, '1');
          card.innerHTML = '<button class="abrevcm-x" type="button" aria-label="Fechar">×</button>' +
            '<span class="abrevcm-pill">Comunidade ABREV</span>' +
            '<p class="abrevcm-ok" style="margin-top:16px;font-size:1.05rem">Cadastro feito! Confira seu e-mail. 💚</p>';
          card.querySelector('.abrevcm-x').addEventListener('click', close);
        })
        .catch(function () {
          status.textContent = 'Não foi possível concluir agora. Tente novamente.';
          btn.disabled = false; btn.textContent = label;
        });
    });
  }

  function origemTag() {
    var p = location.pathname;
    if (p.indexOf('/blog') === 0) return 'BLOG';
    if (p.indexOf('/evento') === 0) return 'EVENTO';
    return 'HOME';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
