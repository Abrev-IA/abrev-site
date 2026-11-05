/* ABREV: medição compartilhada com as preferências existentes de consentimento. */
(function () {
  'use strict';
  if (!/^(www\.)?abrev\.org$/.test(window.location.hostname)) return;
  if (window.__abrevAnalytics) return;
  window.__abrevAnalytics = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
  try { if (localStorage.getItem('abrev_cookie_consent') === 'accepted') window.gtag('consent','update',{analytics_storage:'granted'}); } catch (_) {}
  window.gtag('js', new Date());
  window.gtag('config', 'G-D2D314Q1CQ', {page_location: window.location.origin + window.location.pathname});
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-D2D314Q1CQ';
  document.head.appendChild(script);

  // Only fixed labels are accepted. Never read field values, link text or URLs into events.
  var forms = ['community', 'study', 'event'];
  var methods = ['email', 'phone', 'whatsapp', 'chat', 'google_forms'];
  var events = ['abrev_contact_click', 'abrev_chat_open', 'abrev_collaboration_click',
    'abrev_registration_start', 'abrev_registration_request', 'abrev_registration_error'];
  function track(name, labels) {
    if (events.indexOf(name) < 0) return;
    try { if (localStorage.getItem('abrev_cookie_consent') !== 'accepted') return; } catch (_) { return; }
    labels = labels || {};
    var params = {send_to:'G-D2D314Q1CQ', transport_type:'beacon'};
    if (forms.indexOf(labels.form_id) >= 0) params.form_id = labels.form_id;
    if (methods.indexOf(labels.contact_method) >= 0) params.contact_method = labels.contact_method;
    if (['header', 'footer', 'central', 'content'].indexOf(labels.link_placement) >= 0) params.link_placement = labels.link_placement;
    if (name === 'abrev_registration_request') params.delivery_status = 'unconfirmed';
    window.gtag('event', name, params);
  }
  window.abrevAnalytics = {track:track};
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest && event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented) return;
    var href = anchor.getAttribute('href') || '', method;
    if (/^mailto:/i.test(href)) method = 'email';
    else if (/^tel:/i.test(href)) method = 'phone';
    else {
      var url;
      try { url = new URL(href, window.location.href); } catch (_) { return; }
      if (['wa.me','api.whatsapp.com','web.whatsapp.com'].indexOf(url.hostname) >= 0) method = 'whatsapp';
      else if (url.hostname === 'docs.google.com' && url.pathname.indexOf('/forms/') === 0) method = 'google_forms';
    }
    if (!method) return;
    var placement = anchor.closest('#abrev-hub') ? 'central' : anchor.closest('footer') ? 'footer' : anchor.closest('header') ? 'header' : 'content';
    track(method === 'google_forms' ? 'abrev_collaboration_click' : 'abrev_contact_click', {contact_method:method, link_placement:placement});
  });
  var started = new WeakSet();
  document.addEventListener('focusin', function (event) {
    var form = event.target.closest && event.target.closest('.hub-form, #estudoForm, #reg-form');
    if (!form || started.has(form) || !/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    // A refusal must not consume the first measured interaction after consent is granted.
    try { if (localStorage.getItem('abrev_cookie_consent') !== 'accepted') return; } catch (_) { return; }
    started.add(form);
    track('abrev_registration_start', {form_id:form.matches('.hub-form') ? 'community' : form.id === 'estudoForm' ? 'study' : 'event'});
  });
})();
