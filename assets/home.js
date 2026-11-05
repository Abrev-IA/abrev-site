/* ABREV: navegação móvel e carregamento progressivo da página inicial. */
(function () {
  'use strict';
  var menu = document.querySelector('.menu');
  var links = document.getElementById('home-navigation');
  function closeMenu(returnFocus) {
    if (!menu || !links) return;
    links.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Abrir menu');
    if (returnFocus) menu.focus();
  }
  if (menu && links) {
    menu.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && links.classList.contains('open')) closeMenu(true);
    });
    document.addEventListener('click', function (event) {
      if (!event.target.closest('.nav')) closeMenu(false);
    });
    var mobile = window.matchMedia('(max-width: 940px)');
    if (mobile.addEventListener) mobile.addEventListener('change', function () { closeMenu(false); });
  }

  // Content stays visible if JavaScript or IntersectionObserver is unavailable.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('pending');
          entry.target.classList.add('in');
          reveal.unobserve(entry.target);
        }
      });
    }, {threshold:0.12});
    document.querySelectorAll('.reveal').forEach(function (element) {
      element.classList.add('pending');
      reveal.observe(element);
    });
  }

  var track = document.getElementById('media-track');
  if (!track) return;
  document.querySelectorAll('[data-media-dir]').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = track.querySelector('.media-card');
      if (!card) return;
      track.scrollBy({left:Number(button.dataset.mediaDir) * (card.getBoundingClientRect().width + 24),
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
  });

  var requested = false;
  function loadPress() {
    if (requested) return;
    requested = true;
    fetch('/imprensa/').then(function (response) {
      if (!response.ok) throw Error('Press unavailable');
      return response.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var cards = Array.from(doc.querySelectorAll('.presscard'));
      if (!cards.length) return;
      var fragment = document.createDocumentFragment();
      cards.forEach(function (card) {
        var url = new URL(card.getAttribute('href'), location.origin);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
        var article = document.createElement('article');
        article.className = 'media-card';
        var source = card.querySelector('.pill')?.textContent.trim() || 'Na imprensa';
        var logo = card.dataset.logo;
        if (/estadão/i.test(source)) logo = '/assets/media/estadao.svg';
        if (/e-commerce brasil/i.test(source)) logo = '/assets/media/ecommerce-brasil.svg';
        if (logo) {
          var image = document.createElement('img');
          image.src = logo; image.alt = source; image.loading = 'lazy'; image.decoding = 'async';
          image.width = 240; image.height = 88;
          image.dataset.surface = card.dataset.logoSurface || 'light';
          article.append(image);
        }
        var label = document.createElement('small'); label.textContent = source; article.append(label);
        var heading = document.createElement('h3');
        heading.textContent = card.querySelector('h2')?.textContent || 'Reportagem sobre a ABREV'; article.append(heading);
        var original = card.querySelector('.press-original');
        if (original) {
          var title = document.createElement('p'); title.className = 'media-original';
          title.textContent = original.textContent.replace(/^Título original/, 'Título original: '); article.append(title);
        }
        var paragraphs = Array.from(card.querySelectorAll('p')).filter(function (p) { return !p.classList.contains('press-original'); });
        if (paragraphs[0]) { var p = document.createElement('p'); p.textContent = paragraphs[0].textContent; article.append(p); }
        if (paragraphs[1]) { var credit = document.createElement('small'); credit.textContent = paragraphs[1].textContent; article.append(credit); }
        var link = document.createElement('a'); link.href = url.href; link.textContent = 'Ler a reportagem →';
        if (url.origin !== location.origin) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        article.append(link); fragment.append(article);
      });
      // Retain the server-rendered cards if no usable items were returned.
      if (fragment.childNodes.length) track.replaceChildren(fragment);
    }).catch(function () { /* Static press links remain available offline. */ });
  }
  if ('IntersectionObserver' in window) {
    var press = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        press.disconnect(); loadPress();
      }
    }, {rootMargin:'600px 0px'});
    press.observe(document.getElementById('midia') || track);
  } else loadPress();
})();
