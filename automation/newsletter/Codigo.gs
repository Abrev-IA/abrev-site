/**
 * ABREV — Cadastro, réguas de e-mail e comunidade (Google Apps Script — Web App)
 *
 * Implementa o fluxo descrito em "ABREV — Fluxo de cadastro e réguas de e-mail":
 *
 *   ENTRADAS (POST para /exec):
 *     • action:"community"  → pop-up "Faça parte da comunidade" (nome, telefone
 *       opcional, e-mail). Entra na lista COMUNIDADE e recebe E1 (só na 1ª vez).
 *     • action:"estudo"     → blog "Receber o estudo completo" (nome, e-mail,
 *       opt_in). Registra em LEADS-ESTUDO e recebe E2 (com link do PDF). Se
 *       opt_in=true, também entra na COMUNIDADE (sem novo E1).
 *     • action:"broadcast"  → régua quinzenal (protegido por chave): envia o
 *       novo artigo para toda a lista COMUNIDADE ativa.
 *
 *   DESCADASTRO (GET /exec?unsub=<token>): sai da COMUNIDADE, mostra página de
 *   confirmação e recebe E4.
 *
 *   E3 (candidatura a associado) é enviado pelo script do FORMULÁRIO Google
 *   (automation/associacao/NotificarDiretoria.gs), não por aqui.
 *
 *   Obs.: os TEXTOS E1–E4/régua abaixo são PROVISÓRIOS (revisão pendente).
 *   O PDF do estudo vai por LINK (não anexo).
 */

// ===================== CONFIG =====================
var CONFIG = {
  SHEET_ID: '1tkXddI8fxj_z4L1DHZBTuJj-ci-xVhYCZIAM2FSF_lI',   // planilha "ABREV — Cadastros Site"
  TAB_COMUNIDADE: 'Comunidade',   // lista que recebe a régua quinzenal
  TAB_LEADS: 'Leads-Estudo',      // quem pediu estudo (não recebe régua sem opt-in)

  SITE_BASE: 'https://abrev.org',
  BLOG_PATH: '/blog/',
  ESTUDOS_PATH: '/blog/estudos/',
  BLOG_INDEX: 'https://abrev.org/blog/',
  PRIVACY_URL: 'https://abrev.org/politica-privacidade.html',
  ASSETS_BASE: 'https://raw.githubusercontent.com/Abrev-IA/abrev-site/main', // p/ ler título/resumo na régua

  SENDER_NAME: 'ABREV — Associação Brasileira de Reversa do Varejo',
  FROM_EMAIL: 'adm@abrev.org',   // precisa ser alias "Enviar como" VERIFICADO na conta do script
  REPLY_TO: 'adm@abrev.org',

  VERSION: 'fluxo-e1e4-1'
};

// Paleta ABREV (e-mail-safe)
var COR = { navy: '#153244', green: '#a4c63d', teal: '#0ca2a6', cream: '#fbf8f0', muted: '#607581', line: '#e5eaed' };

var HEAD_COM = ['data_hora','nome','telefone','email','origem','status','token','ultimo_envio'];
var CC = { data:0, nome:1, telefone:2, email:3, origem:4, status:5, token:6, ultimo_envio:7 };

var HEAD_LEAD = ['data_hora','nome','email','origem','artigo','artigo_url','opt_in','ultimo_envio'];
var CL = { data:0, nome:1, email:2, origem:3, artigo:4, artigo_url:5, opt_in:6, ultimo_envio:7 };

// ===================== ROTEAMENTO =====================
function doPost(e) {
  var data = {};
  try { data = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { data = {}; }
  var action = String(data.action || '').trim();

  if (action === 'broadcast') {
    if (!chaveOk_(data.key)) return json_({ ok: false, error: 'unauthorized' });
    return json_({ ok: true, broadcast: broadcastRegua_(String(data.slug || ''), String(data.titulo || ''), String(data.resumo || '')) });
  }

  var r = normalizar_(data);
  if (!r.email) return json_({ ok: false, error: 'email' });

  if (action === 'community') {
    var res = upsertComunidade_(r, 'popup');
    if (res.novo) { try { enviarE1_(r.email, r.nome, res.token); } catch (e1) {} }
    return json_({ ok: true, novo: res.novo });
  }

  if (action === 'estudo') {
    registrarLead_(r);
    var tokenCom = '';
    if (r.opt_in) { tokenCom = upsertComunidade_(r, 'blog_optin').token; }   // entra na comunidade (sem novo E1)
    var tokenRodape = tokenCom || upsertTokenSomente_(r.email);
    try { enviarE2_(r.email, r.nome, r.artigo, r.artigo_url, r.slug, r.opt_in, tokenRodape); } catch (e2) {}
    return json_({ ok: true, opt_in: r.opt_in });
  }

  return json_({ ok: false, error: 'action' });
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.unsub) {
    var r = descadastrar_(String(p.unsub));
    if (r.ok && r.email) { try { enviarE4_(r.email, r.nome); } catch (e4) {} }
    return htmlDescadastro_(r.ok);
  }
  if (p.broadcast) {
    if (!chaveOk_(p.key)) return json_({ ok: false, error: 'unauthorized' });
    return json_({ ok: true, broadcast: broadcastRegua_(String(p.broadcast || ''), String(p.titulo || ''), String(p.resumo || '')) });
  }
  if (p.diag) {
    if (!chaveOk_(p.key)) return json_({ ok: false, error: 'unauthorized' });
    var out = { ok: true, version: CONFIG.VERSION, from_email: CONFIG.FROM_EMAIL, reply_to: CONFIG.REPLY_TO,
      sheet_id: CONFIG.SHEET_ID, cota_restante: MailApp.getRemainingDailyQuota() };
    try { out.comunidade = Math.max(0, aba_(CONFIG.TAB_COMUNIDADE, HEAD_COM).getLastRow() - 1); } catch (eC) { out.comunidade = -1; out.erro_com = String(eC); }
    try { out.leads = Math.max(0, aba_(CONFIG.TAB_LEADS, HEAD_LEAD).getLastRow() - 1); } catch (eL) { out.leads = -1; }
    return json_(out);
  }
  return json_({ ok: true, service: 'ABREV newsletter', version: CONFIG.VERSION, time: new Date().toISOString() });
}

// ===================== PLANILHA =====================
function planilhaSS_() {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não encontrada. Defina CONFIG.SHEET_ID.');
  return ss;
}
function aba_(nome, headers) {
  var ss = planilhaSS_();
  var sheet = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

// COMUNIDADE: cria ou atualiza (chave = e-mail). Retorna { token, novo }.
function upsertComunidade_(r, origem) {
  var sheet = aba_(CONFIG.TAB_COMUNIDADE, HEAD_COM);
  var last = sheet.getLastRow();
  var emailLower = r.email.toLowerCase();
  if (last >= 2) {
    var rng = sheet.getRange(2, 1, last - 1, HEAD_COM.length).getValues();
    for (var i = 0; i < rng.length; i++) {
      if (String(rng[i][CC.email]).trim().toLowerCase() === emailLower) {
        var row = i + 2;
        var token = String(rng[i][CC.token]) || Utilities.getUuid();
        sheet.getRange(row, CC.status + 1).setValue('ativo');
        sheet.getRange(row, CC.token + 1).setValue(token);
        if (r.nome) sheet.getRange(row, CC.nome + 1).setValue(r.nome);
        if (r.telefone) sheet.getRange(row, CC.telefone + 1).setValue(r.telefone);
        return { token: token, novo: false };
      }
    }
  }
  var novoToken = Utilities.getUuid();
  sheet.appendRow([new Date(), r.nome, r.telefone, r.email, origem || '', 'ativo', novoToken, '']);
  return { token: novoToken, novo: true };
}

// LEADS-ESTUDO: registra o pedido de estudo (histórico; não recebe régua).
function registrarLead_(r) {
  var sheet = aba_(CONFIG.TAB_LEADS, HEAD_LEAD);
  sheet.appendRow([new Date(), r.nome, r.email, r.origem || 'blog', r.artigo, r.artigo_url, r.opt_in ? 'sim' : 'não', new Date()]);
}

// Retorna um token para o rodapé de descadastro mesmo quando a pessoa não entrou
// na comunidade (lead sem opt-in): reaproveita o token da comunidade se existir.
function upsertTokenSomente_(email) {
  var sheet = aba_(CONFIG.TAB_COMUNIDADE, HEAD_COM);
  var last = sheet.getLastRow();
  if (last >= 2) {
    var rng = sheet.getRange(2, 1, last - 1, HEAD_COM.length).getValues();
    var emailLower = String(email).toLowerCase();
    for (var i = 0; i < rng.length; i++) {
      if (String(rng[i][CC.email]).trim().toLowerCase() === emailLower) return String(rng[i][CC.token]) || '';
    }
  }
  return '';
}

function descadastrar_(token) {
  if (!token) return { ok: false };
  var sheet = aba_(CONFIG.TAB_COMUNIDADE, HEAD_COM);
  var last = sheet.getLastRow();
  if (last < 2) return { ok: false };
  var rng = sheet.getRange(2, 1, last - 1, HEAD_COM.length).getValues();
  for (var i = 0; i < rng.length; i++) {
    if (String(rng[i][CC.token]) === token) {
      sheet.getRange(i + 2, CC.status + 1).setValue('descadastrado');
      return { ok: true, email: String(rng[i][CC.email]), nome: String(rng[i][CC.nome]) };
    }
  }
  return { ok: false };
}

function marcarEnvioComunidade_(row) {
  aba_(CONFIG.TAB_COMUNIDADE, HEAD_COM).getRange(row, CC.ultimo_envio + 1).setValue(new Date());
}

// ===================== RÉGUA QUINZENAL =====================
function broadcastRegua_(slug, tituloOpc, resumoOpc) {
  if (!slug) return { erro: 'slug vazio' };
  var blogUrl = CONFIG.SITE_BASE + CONFIG.BLOG_PATH + slug + '.html';
  var titulo = tituloOpc || fetchTitulo_(CONFIG.ASSETS_BASE + CONFIG.BLOG_PATH + slug + '.html') || slug;
  var resumo = resumoOpc || fetchDescription_(CONFIG.ASSETS_BASE + CONFIG.BLOG_PATH + slug + '.html') || '';

  var sheet = aba_(CONFIG.TAB_COMUNIDADE, HEAD_COM);
  var last = sheet.getLastRow();
  if (last < 2) return { total: 0, enviados: 0 };
  var rows = sheet.getRange(2, 1, last - 1, HEAD_COM.length).getValues();
  var enviados = 0, semCota = 0, ativos = 0;
  for (var i = 0; i < rows.length; i++) {
    var status = String(rows[i][CC.status]).trim().toLowerCase();
    var email = String(rows[i][CC.email]).trim();
    if (status !== 'ativo' || !email) continue;
    ativos++;
    if (MailApp.getRemainingDailyQuota() <= 0) { semCota++; continue; }
    try {
      enviarRegua_(email, String(rows[i][CC.nome]), titulo, resumo, blogUrl, String(rows[i][CC.token]));
      marcarEnvioComunidade_(i + 2);
      enviados++;
    } catch (err) {}
  }
  return { slug: slug, titulo: titulo, ativos: ativos, enviados: enviados, sem_cota: semCota, cota_restante: MailApp.getRemainingDailyQuota() };
}

// ===================== E-MAILS (TEXTOS PROVISÓRIOS) =====================
function enviarE1_(email, nome, token) {
  var inner =
    '<p>Olá, ' + esc_(primeiroNome_(nome)) + '!</p>' +
    '<p>Obrigada por se cadastrar. Agora você faz parte da comunidade da ABREV — Associação Brasileira de Reversa do Varejo.</p>' +
    '<p>Aqui você vai ficar por dentro do panorama da reversa no Brasil. Vai receber:</p>' +
    '<ul><li>nossos artigos quinzenais;</li><li>pesquisas e estudos da associação;</li><li>convites para eventos e a agenda do setor.</li></ul>' +
    '<p>Enquanto o próximo artigo não chega, conheça o que já publicamos:</p>' +
    botao_('Ler o blog da ABREV', CONFIG.BLOG_INDEX) +
    '<p>Seja bem-vindo(a)!<br>Equipe ABREV</p>';
  enviar_(email, 'Bem-vindo(a) à comunidade ABREV', inner, token);
}

function enviarE2_(email, nome, artigo, artigoUrl, slug, optIn, token) {
  var pdfUrl = CONFIG.SITE_BASE + CONFIG.ESTUDOS_PATH + slug + '.pdf';
  var blogUrl = artigoUrl || (CONFIG.SITE_BASE + CONFIG.BLOG_PATH + slug + '.html');
  var bloco = optIn
    ? '<p style="background:' + COR.cream + ';border-radius:12px;padding:14px 16px">Você também passou a fazer parte da nossa comunidade. A cada 15 dias, vai receber nossos artigos, além de pesquisas, estudos e convites para eventos.</p>'
    : '<p>Quer receber conteúdos como este a cada 15 dias, além de pesquisas, estudos e convites para eventos?</p>' +
      botao_('Quero fazer parte da comunidade', CONFIG.SITE_BASE + '/?comunidade=1');
  var inner =
    '<p>Olá, ' + esc_(primeiroNome_(nome)) + '!</p>' +
    '<p>Obrigada pelo interesse no conteúdo da ABREV. Aqui está o estudo completo de “' + esc_(artigo || 'nosso estudo') + '”:</p>' +
    botao_('Acessar o estudo em PDF', pdfUrl) +
    '<p style="font-size:13px;color:' + COR.muted + '">Ou leia o resumo no site: <a href="' + blogUrl + '" style="color:' + COR.teal + '">' + blogUrl + '</a></p>' +
    bloco +
    '<p>Boa leitura!<br>Equipe ABREV</p>';
  enviar_(email, 'Seu estudo completo da ABREV chegou', inner, token);
}

function enviarE4_(email, nome) {
  var inner =
    '<p>Olá, ' + esc_(primeiroNome_(nome)) + '!</p>' +
    '<p>Confirmamos que seu e-mail foi removido da lista de conteúdos da ABREV. A partir de agora, você não receberá mais nossos artigos quinzenais, pesquisas, estudos e convites para eventos.</p>' +
    '<p>Obrigada por ter acompanhado a comunidade até aqui.</p>' +
    '<p>Se foi um engano ou se quiser voltar no futuro, é só se cadastrar novamente:</p>' +
    botao_('Voltar para a comunidade', CONFIG.SITE_BASE + '/?comunidade=1') +
    '<p>Equipe ABREV</p>';
  // E4 NÃO leva rodapé de descadastro (já saiu da lista).
  enviar_(email, 'Você foi removido(a) da lista da ABREV', inner, '');
}

function enviarRegua_(email, nome, titulo, resumo, blogUrl, token) {
  var inner =
    '<p style="font-size:13px;color:' + COR.muted + ';margin:0 0 6px">Novo estudo da ABREV</p>' +
    '<h2 style="color:' + COR.navy + ';margin:0 0 10px">' + esc_(titulo) + '</h2>' +
    (resumo ? '<p>' + esc_(resumo) + '</p>' : '') +
    botao_('Ler no site', blogUrl) +
    '<p style="font-size:13px;color:' + COR.muted + '">No fim do artigo você pode receber o estudo completo em PDF por e-mail.</p>';
  enviar_(email, titulo, inner, token);
}

// ===================== INFRA DE E-MAIL =====================
function enviar_(email, assunto, innerHtml, token) {
  var html = wrap_(innerHtml, token);
  var options = { name: CONFIG.SENDER_NAME, replyTo: CONFIG.REPLY_TO, htmlBody: html };
  if (CONFIG.FROM_EMAIL) options.from = CONFIG.FROM_EMAIL;
  MailApp.sendEmail(email, assunto, 'Abra este e-mail em um leitor com HTML para visualizar.', options);
}

function wrap_(inner, token) {
  var rodape = token ? rodapeDescadastro_(token) : rodapeSimples_();
  return '' +
    '<div style="margin:0;background:' + COR.cream + ';padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:' + COR.navy + '">' +
      '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 34px rgba(21,50,68,.08)">' +
        '<div style="background:' + COR.navy + ';padding:20px 28px;color:#fff;font-weight:bold;letter-spacing:1px">ABREV</div>' +
        '<div style="padding:28px;line-height:1.6;font-size:15px">' + inner + '</div>' +
      '</div>' +
      rodape +
    '</div>';
}

function botao_(texto, href) {
  return '<p style="margin:20px 0"><a href="' + href + '" style="display:inline-block;background:' + COR.navy + ';color:#fff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:bold">' + esc_(texto) + '</a></p>';
}

function rodapeDescadastro_(token) {
  var link = execUrl_() + '?unsub=' + encodeURIComponent(token || '');
  return '<div style="max-width:600px;margin:14px auto 0;font-size:12px;color:#8a97a0;line-height:1.6;text-align:center">' +
    'Você recebe os conteúdos da ABREV porque se cadastrou no site. ' +
    '<a href="' + link + '" style="color:#8a97a0;text-decoration:underline">Não quero mais receber conteúdos</a>.<br>' +
    '<a href="' + CONFIG.PRIVACY_URL + '" style="color:#8a97a0;text-decoration:underline">Política de Privacidade</a>' +
    '</div>';
}
function rodapeSimples_() {
  return '<div style="max-width:600px;margin:14px auto 0;font-size:12px;color:#8a97a0;line-height:1.6;text-align:center">' +
    '<a href="' + CONFIG.PRIVACY_URL + '" style="color:#8a97a0;text-decoration:underline">Política de Privacidade</a>' +
    '</div>';
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
    slug: String(data.slug || slugFromUrl_(data.artigo_url) || '').trim(),
    opt_in: data.opt_in === true || data.opt_in === 'true'
  };
}

function primeiroNome_(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }

function chaveOk_(key) {
  var secret = PropertiesService.getScriptProperties().getProperty('BROADCAST_KEY');
  return !!secret && String(key || '') === secret;
}

function execUrl_() {
  try { return ScriptApp.getService().getUrl() || CONFIG.SITE_BASE; } catch (e) { return CONFIG.SITE_BASE; }
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
  var m = fetchText_(url).match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1].split('|')[0].replace(/\s+/g, ' ').trim() : '';
}
function fetchDescription_(url) {
  var m = fetchText_(url).match(/<meta[^>]+name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function esc_(s) {
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
    ? 'Você não receberá mais os conteúdos da ABREV por e-mail. Enviamos um e-mail confirmando. Se mudar de ideia, é só se cadastrar de novo no site.'
    : 'Não encontramos esse cadastro. O link pode ter expirado ou já foi usado.';
  var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + titulo + ' — ABREV</title></head>' +
    '<body style="margin:0;background:' + COR.cream + ';font-family:Arial,Helvetica,sans-serif;color:' + COR.navy + '">' +
    '<div style="max-width:520px;margin:12vh auto;background:#fff;border-radius:16px;padding:40px 32px;text-align:center;box-shadow:0 20px 60px rgba(7,26,37,.12)">' +
    '<div style="display:inline-block;background:' + COR.navy + ';color:#fff;font-weight:bold;letter-spacing:1px;padding:8px 14px;border-radius:999px">ABREV</div>' +
    '<h1 style="font-size:22px;color:' + COR.navy + ';margin:22px 0 10px">' + titulo + '</h1>' +
    '<p style="color:' + COR.muted + ';line-height:1.6;margin:0 0 20px">' + msg + '</p>' +
    '<a href="' + CONFIG.SITE_BASE + '" style="display:inline-block;background:' + COR.navy + ';color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">Ir para o site</a>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(titulo + ' — ABREV');
}
