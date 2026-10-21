/* ABREV: central única de conteúdos, participação, atendimento e privacidade. */
(function () {
  'use strict';
  if (window.__abrevComunidade) return;
  window.__abrevComunidade = true;
  var EXEC = 'https://script.google.com/macros/s/AKfycbyJPKHIzLvghLIkJpORZd7vYTGiDzSY_ybiAdnub3CX4bLLzPx5O-eTDc0hxpRc9DjIDw/exec';
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function init() {
    var style = document.createElement('style');
    style.textContent = `
      .abrev-hub{border:0;padding:0;border-radius:24px;width:min(600px,calc(100% - 28px));max-height:calc(100dvh - 28px);overflow:auto;background:#fbf8f0;color:#153244;box-shadow:0 24px 80px #071a2555;font:15px/1.6 Inter,Arial,sans-serif}
      .abrev-hub::backdrop{background:#071a2599;backdrop-filter:blur(4px)}
      .abrev-hub *{box-sizing:border-box}.abrev-hub [hidden]{display:none!important}
      .abrev-hub header{background:#153244;color:white;padding:24px 28px;position:relative}
      .abrev-hub h2{font:800 25px/1.2 Montserrat,Arial,sans-serif;letter-spacing:-.02em;max-width:none;margin:8px 36px 0 0;color:inherit}
      .abrev-hub header small{color:#a4c63d;font-weight:800;letter-spacing:.12em}
      .abrev-hub button,.abrev-hub input{font:inherit}.abrev-hub button{cursor:pointer}
      .abrev-hub .hub-close{position:absolute;right:16px;top:18px;border:1px solid #ffffff55;background:transparent;color:white;border-radius:50%;width:36px;height:36px;font-size:24px;line-height:1}
      .hub-nav{display:flex;gap:8px;padding:18px 24px 0;flex-wrap:wrap}
      .hub-nav button{border:1px solid #15324433;border-radius:999px;padding:8px 12px;background:transparent;color:#153244;font-size:13px;font-weight:700}
      .hub-nav button[aria-pressed=true]{background:#153244;color:white}
      .hub-panel{padding:22px 28px 28px}.hub-panel h3{margin:0 0 10px;font-size:21px;line-height:1.3;color:#153244}.hub-panel p{margin:0 0 16px;color:#526976}
      .hub-panel a{color:#08767a}.hub-form{display:grid;gap:12px}.hub-form label{display:grid;gap:4px;font-size:13px;font-weight:600}
      .hub-form input{width:100%;border:1px solid #c8d4da;background:white;color:#153244;padding:11px 12px;border-radius:9px}
      .abrev-hub .hub-primary{border:0;background:#153244;color:white;border-radius:9px;padding:12px 16px;font-weight:700;display:inline-block;text-decoration:none;text-align:center}
      .hub-form button:disabled{opacity:.6;cursor:wait}.hub-note{font-size:12px;margin-top:14px!important}.hub-status{font-size:14px;margin:0!important;min-height:22px}
      .hub-options{display:grid;gap:10px}.hub-options a{display:block;padding:14px 16px;border:1px solid #d5dfe0;border-radius:12px;background:white;text-decoration:none;color:#153244;font-weight:700}.hub-options small{display:block;font-weight:400;color:#526976}
      .hub-cookie-actions{display:flex;gap:10px;flex-wrap:wrap}.hub-cookie-actions button{flex:1;border:1px solid #153244;border-radius:9px;padding:11px;background:white;color:#153244;font-weight:700;min-width:160px}
      .hub-launcher{position:fixed;right:20px;bottom:20px;z-index:9998;background:#153244;color:white;border:0;border-radius:999px;padding:15px 22px;box-shadow:0 8px 30px #071a2533;font:700 14px Inter,Arial,sans-serif;cursor:pointer}
      .abrev-hub :focus-visible,.hub-launcher:focus-visible{outline:3px solid #0ca2a6;outline-offset:3px}
      body:not(.abrev-chat-active) #tidio-chat{display:none!important}
      @media(max-width:480px){.abrev-hub header{padding:22px}.hub-nav{padding:16px 18px 0}.hub-panel{padding:20px 22px}.hub-launcher{right:14px;bottom:14px}}
      @media(prefers-reduced-motion:reduce){.abrev-hub *{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
    var launcher = document.createElement('button');
    launcher.type = 'button'; launcher.className = 'hub-launcher'; launcher.textContent = 'ABREV · Como participar';
    launcher.setAttribute('aria-haspopup', 'dialog'); launcher.setAttribute('aria-controls', 'abrev-hub');
    var dialog = document.createElement('dialog');
    dialog.id = 'abrev-hub'; dialog.className = 'abrev-hub'; dialog.setAttribute('aria-labelledby', 'hub-title');
    dialog.innerHTML = `
      <header><small>CENTRAL ABREV</small><h2 id="hub-title">Vamos conectar a reversa?</h2><button class="hub-close" type="button" aria-label="Fechar janela">×</button></header>
      <nav class="hub-nav" aria-label="Opções da central">
        <button type="button" data-hub="conteudos" aria-pressed="true">Conteúdos</button>
        <button type="button" data-hub="participar" aria-pressed="false">Participar</button>
        <button type="button" data-hub="atendimento" aria-pressed="false">Atendimento</button>
        <button type="button" data-hub="privacidade" aria-pressed="false">Privacidade</button>
      </nav>
      <section class="hub-panel" data-panel="conteudos" aria-labelledby="hub-content-title">
        <h3 id="hub-content-title">Conteúdo que move a reversa</h3>
        <p>Receba os artigos da ABREV, pesquisas, estudos e convites para eventos sobre logística reversa no varejo.</p>
        <form class="hub-form">
          <label>Seu nome<input name="nome" autocomplete="name" required maxlength="150"></label>
          <label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <label>Telefone / WhatsApp (opcional)<input name="telefone" type="tel" autocomplete="tel" maxlength="40"></label>
          <button class="hub-primary" type="submit">Quero receber conteúdos</button>
          <p class="hub-status" role="status" aria-live="polite"></p>
        </form>
        <p class="hub-note">Ao solicitar o cadastro, você autoriza o envio de conteúdos da ABREV. Consulte a <a href="/politica-privacidade.html">Política de Privacidade</a>.</p>
        <a href="/blog/">Explorar artigos e estudos →</a>
      </section>
      <section class="hub-panel" data-panel="participar" aria-labelledby="hub-part-title" hidden>
        <h3 id="hub-part-title">Como você quer participar?</h3><p>Escolha o caminho que combina com sua contribuição.</p>
        <div class="hub-options">
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSfyY5uT-RLdvHpEahnG4NZ307dGou02DyFkAbjCyr5ijrSovA/viewform">Quero colaborar<small>Contribuir com projetos, pesquisas, estudos e eventos.</small></a>
          <a href="mailto:adm@abrev.org?subject=Interesse%20em%20ser%20associado%20efetivo">Quero me associar<small>Falar com a ABREV sobre associação efetiva.</small></a>
          <a href="mailto:adm@abrev.org?subject=Interesse%20no%20Conselho%20Consultivo">Conselho Consultivo<small>Manifestar interesse em contribuir como conselheiro.</small></a>
        </div><p class="hub-note">Os caminhos seguem os canais atuais da <a href="/colabore.html">página Colabore</a>.</p>
      </section>
      <section class="hub-panel" data-panel="atendimento" aria-labelledby="hub-chat-title" hidden>
        <h3 id="hub-chat-title">Converse com a ABREV</h3><p>Tire dúvidas sobre a associação e as formas de participação.</p>
        <button class="hub-primary" type="button" id="hub-chat">Iniciar conversa</button>
        <p id="hub-chat-status" class="hub-note" role="status" aria-live="polite"></p>
        <p class="hub-note">Você também pode escrever para <a href="mailto:adm@abrev.org">adm@abrev.org</a>.</p>
      </section>
      <section class="hub-panel" data-panel="privacidade" aria-labelledby="hub-privacy-title" hidden>
        <h3 id="hub-privacy-title">Suas preferências de cookies</h3>
        <p>Usamos cookies opcionais para analisar o tráfego e melhorar sua experiência. Você pode aceitar ou recusar e alterar sua escolha nesta central.</p>
        <div class="hub-cookie-actions"><button type="button" data-consent="rejected">Recusar opcionais</button><button class="hub-primary" type="button" data-consent="accepted">Aceitar opcionais</button></div>
        <p id="hub-cookie-status" class="hub-note" role="status" aria-live="polite"></p>
        <a href="/politica-privacidade.html">Ler a Política de Privacidade →</a>
      </section>`;
    document.body.append(launcher, dialog);
    var previousFocus, previousOverflow, chatRequested = false, chatReady = false;
    function select(panel) {
      dialog.querySelectorAll('[data-panel]').forEach(function (el) { el.hidden = el.dataset.panel !== panel; });
      dialog.querySelectorAll('[data-hub]').forEach(function (el) { el.setAttribute('aria-pressed', String(el.dataset.hub === panel)); });
    }
    function open(panel) {
      select(panel || 'conteudos');
      if (!dialog.open) { previousFocus = document.activeElement; previousOverflow = document.body.style.overflow; dialog.showModal(); document.body.style.overflow = 'hidden'; }
      launcher.hidden = true;
    }
    function close() { chatRequested = false; dialog.close(); }
    dialog.addEventListener('close', function () {
      if (dialog.open) return;
      document.body.style.overflow = previousOverflow || '';
      launcher.hidden = chatRequested;
      if (!chatRequested && previousFocus && previousFocus.isConnected) previousFocus.focus();
    });
    dialog.querySelector('.hub-close').addEventListener('click', close);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) { var rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) close(); } });
    launcher.addEventListener('click', function () { open('conteudos'); });
    dialog.querySelectorAll('[data-hub]').forEach(function (button) { button.addEventListener('click', function () { select(button.dataset.hub); }); });
    document.querySelectorAll('.openReport,[data-open-abrev]').forEach(function (el) { el.addEventListener('click', function (e) { e.preventDefault(); open(el.dataset.openAbrev || 'conteudos'); }); });
    dialog.querySelectorAll('[data-consent]').forEach(function (button) { button.addEventListener('click', function () {
      var value = button.dataset.consent; save('abrev_cookie_consent', value);
      if (typeof window.gtag === 'function') window.gtag('consent', 'update', {analytics_storage: value === 'accepted' ? 'granted' : 'denied'});
      consentStatus(); close();
    }); });
    function consentStatus() { var value = read('abrev_cookie_consent'); dialog.querySelector('#hub-cookie-status').textContent = value === 'accepted' ? 'Sua escolha atual: cookies opcionais aceitos.' : value === 'rejected' ? 'Sua escolha atual: cookies opcionais recusados.' : 'Nenhuma preferência salva. Cookies opcionais permanecem desativados.'; }
    consentStatus();
    dialog.querySelector('.hub-form').addEventListener('submit', async function (e) {
      e.preventDefault(); var form = e.currentTarget;
      if (!form.reportValidity()) return;
      var status = form.querySelector('.hub-status'), button = form.querySelector('button');
      var name = form.elements.nome.value.trim(), email = form.elements.email.value.trim();
      if (!name) { status.textContent = 'Informe seu nome.'; form.elements.nome.focus(); return; }
      button.disabled = true; button.textContent = 'Enviando…'; status.textContent = '';
      var origem = location.pathname.indexOf('/blog') === 0 ? 'BLOG' : location.pathname.indexOf('/evento') === 0 ? 'EVENTO' : 'HOME';
      var tel = form.elements.telefone.value.trim();
      try {
        await fetch(EXEC, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body:JSON.stringify({action:'community', nome:name, email:email, telefone:tel ? '[' + origem + '] ' + tel : '', origem:'popup_' + origem.toLowerCase()})});
        save('abrev_comunidade_done', '1'); status.textContent = 'Solicitação enviada. Confira seu e-mail para acompanhar os conteúdos da ABREV.'; button.textContent = 'Solicitação enviada';
      } catch (_) { status.textContent = 'Não foi possível enviar. Tente novamente ou escreva para adm@abrev.org.'; button.disabled = false; button.textContent = 'Tentar novamente'; }
    });
    // Tidio usa a própria janela de conversa, sem sobrepor outra janela ou botão.
    function startChat() {
      if (!chatReady || !chatRequested) return;
      document.body.classList.add('abrev-chat-active'); dialog.close();
      window.tidioChatApi.show(); window.tidioChatApi.open();
    }
    function ready() {
      if (chatReady) return;
      chatReady = true; window.tidioChatApi.hide();
      window.tidioChatApi.on('close', function () {
        window.tidioChatApi.hide(); document.body.classList.remove('abrev-chat-active');
        if (chatRequested) { chatRequested = false; open('atendimento'); }
      });
      startChat();
    }
    document.addEventListener('tidioChat-ready', ready);
    dialog.querySelector('#hub-chat').addEventListener('click', function () {
      chatRequested = true;
      if (chatReady) { startChat(); return; }
      dialog.querySelector('#hub-chat-status').textContent = 'Carregando atendimento…';
      if (!document.getElementById('hub-tidio-script')) {
        var script = document.createElement('script'); script.id = 'hub-tidio-script'; script.src = 'https://code.tidio.co/uyvxz9s1ekcv8mgkxkjalotzsoxad59c.js'; script.async = true;
        script.onerror = function () { chatRequested = false; script.remove(); dialog.querySelector('#hub-chat-status').textContent = 'Atendimento indisponível agora. Tente novamente ou use o e-mail abaixo.'; };
        document.body.appendChild(script);
      }
      setTimeout(function () { if (!chatReady) { chatRequested = false; dialog.querySelector('#hub-chat-status').textContent = 'O chat está demorando para carregar. Tente novamente ou use o e-mail abaixo.'; } }, 15000);
    });
    // Cancelar ou trocar de seção também cancela uma abertura de chat pendente.
    dialog.addEventListener('cancel', function () { chatRequested = false; });
    dialog.querySelectorAll('[data-hub]').forEach(function (el) { el.addEventListener('click', function () { if (!chatReady) chatRequested = false; }); });
    window.abrevCentral = {open:open, close:close};
    if (new URLSearchParams(location.search).get('comunidade') === '1') open('conteudos');
    else if (!read('abrev_cookie_consent')) open('privacidade');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
