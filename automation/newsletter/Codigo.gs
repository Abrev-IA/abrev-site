/**
 * ABREV — Newsletter / Comunidade (Google Apps Script — Web App)
 *
 * Faz três coisas:
 *   1) CADASTRO (opt-in do pop-up "Receber por e-mail"): grava/atualiza o
 *      inscrito na planilha e envia o e-mail do artigo (resumo em HTML no corpo
 *      + PDF completo em anexo), com link de descadastramento.
 *   2) DESCADASTRAMENTO: link no rodapé do e-mail → doGet(?unsub=<token>)
 *      marca o inscrito como "descadastrado".
 *   3) DISPARO EM MASSA (novo artigo): a GitHub Action chama este Web App com
 *      { action:"broadcast", key:<segredo>, slug:<slug> } e ele envia o artigo
 *      para todos os inscritos ativos.
 *
 * PUBLICAÇÃO
 *   1. Planilha de cadastros → Extensões → Apps Script → cole este arquivo.
 *   2. Projeto → Configurações do projeto → Propriedades do script:
 *        BROADCAST_KEY = <uma senha forte>   (a mesma vai no segredo do GitHub)
 *   3. Implantar → Gerenciar implantações → editar (✏️) → Versão: Nova versão
 *      → Implantar. Mantém a mesma URL /exec.
 *   4. Autorize os escopos (planilha, e-mail, buscar URL) na 1ª execução.
 */

// ===================== CONFIG =====================
var CONFIG = {
  SHEET_ID: '',                 // vazio = planilha vinculada; ou o ID entre /d/ e /edit
  SHEET_NAME: 'Cadastros',
  SITE_BASE: 'https://abrev.org',
  BLOG_PATH: '/blog/',
  ESTUDOS_PATH: '/blog/estudos/',
  SENDER_NAME: 'ABREV — Associação Brasileira de Reversa do Varejo',
  REPLY_TO: 'contato@abrev.com.br',
  EMAIL_SUBJECT_PREFIX: 'Estudo ABREV: '
};

var HEADERS = ['data_hora','nome','telefone','email','origem','artigo','artigo_url','status','token','ultimo_envio'];
var COL = { data:0, nome:1, telefone:2, email:3, origem:4, artigo:5, artigo_url:6, status:7, token:8, ultimo_envio:9 };

// ===================== ROTEAMENTO =====================
function doPost(e) {
  var data = {};
  try { data = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { data = {}; }

  if (String(data.action || '') === 'broadcast') {
    if (!chaveOk_(data.key)) return json_({ ok: false, error: 'unauthorized' });
    return json_({ ok: true, broadcast: broadcast_(String(data.slug || ''), String(data.artigo || '')) });
  }

  var r = normalizar_(data);
  if (!r.email) return json_({ ok: false, error: 'email' });

  var token = upsertInscrito_(r);
  var estudoEnviado = false;
  try {
    if (r.enviar_estudo && r.artigo_url) {
      estudoEnviado = enviarArtigo_(r.email, token, slugFromUrl_(r.artigo_url), r.artigo, r.artigo_url);
      if (estudoEnviado) marcarEnvio_(r.email);
    }
  } catch (errMail) { estudoEnviado = false; }

  return json_({ ok: true, estudo_enviado: estudoEnviado });
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.unsub) return htmlDescadastro_(descadastrar_(String(p.unsub)));
  if (p.broadcast) {
    if (!chaveOk_(p.key)) return json_({ ok: false, error: 'unauthorized' });
    return json_({ ok: true, broadcast: broadcast_(String(p.broadcast || ''), String(p.artigo || '')) });
  }
  return json_({ ok: true, service: 'ABREV newsletter', time: new Date().toISOString() });
}

// ===================== PLANILHA =====================
function planilha_() {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não encontrada. Defina CONFIG.SHEET_ID.');
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

// Cria ou atualiza o inscrito (chave = e-mail). Retorna o token.
function upsertInscrito_(r) {
  var sheet = planilha_();
  var last = sheet.getLastRow();
  var emailLower = r.email.toLowerCase();

  if (last >= 2) {
    var rng = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
    for (var i = 0; i < rng.length; i++) {
      if (String(rng[i][COL.email]).trim().toLowerCase() === emailLower) {
        var row = i + 2;
        var token = String(rng[i][COL.token]) || Utilities.getUuid();
        sheet.getRange(row, COL.status + 1).setValue('ativo');       // reativa se estava descadastrado
        sheet.getRange(row, COL.token + 1).setValue(token);
        if (r.nome) sheet.getRange(row, COL.nome + 1).setValue(r.nome);
        if (r.telefone) sheet.getRange(row, COL.telefone + 1).setValue(r.telefone);
        if (r.artigo) sheet.getRange(row, COL.artigo + 1).setValue(r.artigo);
        if (r.artigo_url) sheet.getRange(row, COL.artigo_url + 1).setValue(r.artigo_url);
        return token;
      }
    }
  }
  var novoToken = Utilities.getUuid();
  sheet.appendRow([new Date(), r.nome, r.telefone, r.email, r.origem, r.artigo, r.artigo_url, 'ativo', novoToken, '']);
  return novoToken;
}

function marcarEnvio_(email) {
  var sheet = planilha_();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var emails = sheet.getRange(2, COL.email + 1, last - 1, 1).getValues();
  var emailLower = email.toLowerCase();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === emailLower) {
      sheet.getRange(i + 2, COL.ultimo_envio + 1).setValue(new Date());
      return;
    }
  }
}

function descadastrar_(token) {
  if (!token) return false;
  var sheet = planilha_();
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var tokens = sheet.getRange(2, COL.token + 1, last - 1, 1).getValues();
  for (var i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]) === token) {
      sheet.getRange(i + 2, COL.status + 1).setValue('descadastrado');
      return true;
    }
  }
  return false;
}

// ===================== DISPARO =====================
function enviarArtigo_(email, token, slug, titulo, url) {
  if (!slug) return false;
  url = url || (CONFIG.SITE_BASE + CONFIG.BLOG_PATH + slug + '.html');
  var htmlUrl = CONFIG.SITE_BASE + CONFIG.ESTUDOS_PATH + slug + '.html';
  var pdfUrl  = CONFIG.SITE_BASE + CONFIG.ESTUDOS_PATH + slug + '.pdf';

  var corpo = fetchText_(htmlUrl);
  if (!corpo) {
    corpo = '<div style="font-family:Arial,sans-serif;color:#183545;line-height:1.6">' +
      '<p>Olá!</p><p>Segue o estudo da ABREV:</p>' +
      '<p><strong>' + escapeHtml_(titulo || 'Estudo ABREV') + '</strong></p>' +
      '<p><a href="' + url + '">Ler no site →</a></p></div>';
  }
  corpo += rodapeDescadastro_(token);

  var options = { name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO, htmlBody: corpo };
  var pdf = fetchPdf_(pdfUrl, slug);
  if (pdf) options.attachments = [pdf];

  MailApp.sendEmail(email, CONFIG.EMAIL_SUBJECT_PREFIX + (titulo || 'Logística reversa no varejo'),
    'Seu estudo ABREV está disponível. Abra em um leitor com HTML para visualizar.', options);
  return true;
}

// Envia o artigo para todos os inscritos ativos. Respeita a cota diária do Gmail.
function broadcast_(slug, tituloOpcional) {
  if (!slug) return { erro: 'slug vazio' };
  var url = CONFIG.SITE_BASE + CONFIG.BLOG_PATH + slug + '.html';
  var titulo = tituloOpcional || fetchTitulo_(url) || slug;

  var sheet = planilha_();
  var last = sheet.getLastRow();
  if (last < 2) return { total: 0, enviados: 0 };

  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var enviados = 0, pulados = 0, semCota = 0, total = 0;
  for (var i = 0; i < rows.length; i++) {
    var status = String(rows[i][COL.status]).trim().toLowerCase();
    var email = String(rows[i][COL.email]).trim();
    if (status !== 'ativo' || !email) { pulados++; continue; }
    total++;
    if (MailApp.getRemainingDailyQuota() <= 0) { semCota++; continue; }
    try {
      enviarArtigo_(email, String(rows[i][COL.token]), slug, titulo, url);
      sheet.getRange(i + 2, COL.ultimo_envio + 1).setValue(new Date());
      enviados++;
    } catch (err) { /* segue para o próximo */ }
  }
  return { slug: slug, titulo: titulo, ativos: total, enviados: enviados, sem_cota: semCota, cota_restante: MailApp.getRemainingDailyQuota() };
}

// ===================== UTILITÁRIOS =====================
function normalizar_(data) {
  return {
    nome: String(data.nome || '').trim(),
    telefone: String(data.telefone || '').trim(),
    email: String(data.email || '').trim(),
    origem: String(data.origem || '').trim(),
    artigo: String(data.artigo || '').trim(),
    artigo_url: String(data.artigo_url || '').trim(),
    enviar_estudo: data.enviar_estudo === true || data.enviar_estudo === 'true'
  };
}

function chaveOk_(key) {
  var secret = PropertiesService.getScriptProperties().getProperty('BROADCAST_KEY');
  return !!secret && String(key || '') === secret;
}

function rodapeDescadastro_(token) {
  var link = execUrl_() + '?unsub=' + encodeURIComponent(token || '');
  return '<div style="max-width:600px;margin:16px auto 0;font-family:Arial,sans-serif;font-size:12px;color:#8a97a0;line-height:1.6;text-align:center">' +
    'Você recebe os estudos da ABREV porque se cadastrou no site. ' +
    '<a href="' + link + '" style="color:#8a97a0;text-decoration:underline">Descadastrar-se</a>.' +
    '</div>';
}

function execUrl_() {
  try { return ScriptApp.getService().getUrl() || (CONFIG.SITE_BASE); } catch (e) { return CONFIG.SITE_BASE; }
}

function slugFromUrl_(url) {
  try {
    var path = String(url).split('?')[0].split('#')[0];
    return path.substring(path.lastIndexOf('/') + 1).replace(/\.html?$/i, '').trim();
  } catch (e) { return ''; }
}

function fetchText_(url) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) return res.getContentText('UTF-8');
  } catch (e) {}
  return '';
}

function fetchTitulo_(url) {
  var html = fetchText_(url);
  var m = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  return m[1].split('|')[0].replace(/\s+/g, ' ').trim();
}

function fetchPdf_(url, slug) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) {
      var blob = res.getBlob();
      if (String(blob.getContentType() || '').indexOf('pdf') !== -1) return blob.setName('ABREV-' + slug + '.pdf');
    }
  } catch (e) {}
  return null;
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function htmlDescadastro_(ok) {
  var titulo = ok ? 'Você foi descadastrado' : 'Link inválido';
  var msg = ok
    ? 'Você não receberá mais os estudos da ABREV por e-mail. Se mudar de ideia, é só se cadastrar de novo no site.'
    : 'Não encontramos esse cadastro. O link pode ter expirado ou já foi usado.';
  var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + titulo + ' — ABREV</title></head>' +
    '<body style="margin:0;background:#fbf8f0;font-family:Arial,Helvetica,sans-serif;color:#183545">' +
    '<div style="max-width:520px;margin:12vh auto;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 20px 60px rgba(7,26,37,.12)">' +
    '<div style="display:inline-block;background:#153244;color:#fff;font-weight:bold;letter-spacing:1px;padding:8px 14px;border-radius:999px">ABREV</div>' +
    '<h1 style="font-size:22px;color:#153244;margin:22px 0 10px">' + titulo + '</h1>' +
    '<p style="color:#607581;line-height:1.6;margin:0 0 20px">' + msg + '</p>' +
    '<a href="' + CONFIG.SITE_BASE + '" style="display:inline-block;background:#153244;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">Ir para o site</a>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(titulo + ' — ABREV');
}
