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
  window.gtag('config', 'G-D2D314Q1CQ');
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-D2D314Q1CQ';
  document.head.appendChild(script);
})();
