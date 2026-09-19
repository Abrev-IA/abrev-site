/**
 * ABREV — Cadastro da comunidade (pop-up do blog e formulários do site)
 * Google Apps Script (Web App) que:
 *   1) grava cada cadastro numa aba da planilha do Drive;
 *   2) quando o cadastro vem do pop-up do blog (enviar_estudo=true),
 *      envia o estudo completo por e-mail: HTML reduzido no corpo +
 *      PDF com a identidade visual da ABREV em anexo.
 *
 * COMO PUBLICAR
 *   1. Abra a planilha de cadastros no Google Sheets.
 *   2. Extensões → Apps Script. Cole este arquivo (substituindo o conteúdo atual).
 *   3. Ajuste as constantes em CONFIG abaixo, se necessário.
 *   4. Implantar → Nova implantação → Tipo: App da Web.
 *        - Executar como: Eu mesmo
 *        - Quem pode acessar: Qualquer pessoa
 *      Copie a URL /exec — ela já é a usada no site (mantenha a mesma para
 *      não precisar alterar o front-end; se gerar outra, atualize o site).
 *   5. Autorize os escopos quando solicitado (planilha, e-mail, buscar URL).
 *
 * OBS.: o front-end envia via fetch no-cors, então o retorno não é lido pelo
 * navegador — o importante é a gravação e o envio acontecerem no servidor.
 */

// ===================== CONFIG =====================
var CONFIG = {
  // Deixe vazio para usar a planilha à qual o script está vinculado.
  // Ou informe o ID da planilha (o trecho entre /d/ e /edit da URL).
  SHEET_ID: '',
  SHEET_NAME: 'Cadastros',

  // Base pública do site (sem barra final).
  SITE_BASE: 'https://abrev.org',
  // Pasta onde os agentes publicam os estudos por artigo:
  //   <SITE_BASE>/blog/estudos/<slug>.html  (HTML reduzido para o e-mail)
  //   <SITE_BASE>/blog/estudos/<slug>.pdf   (PDF com identidade ABREV)
  ESTUDOS_PATH: '/blog/estudos/',

  // Remetente/identidade do e-mail.
  SENDER_NAME: 'ABREV — Associação Brasileira de Reversa do Varejo',
  REPLY_TO: 'contato@abrev.com.br',
  EMAIL_SUBJECT_PREFIX: 'Seu estudo ABREV: '
};

// Cabeçalho da planilha (ordem das colunas).
var HEADERS = ['data_hora', 'nome', 'telefone', 'email', 'origem', 'artigo', 'artigo_url', 'estudo_enviado'];

// ===================== ENTRADA =====================
function doPost(e) {
  var data = {};
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    data = {};
  }

  var registro = {
    nome: String(data.nome || '').trim(),
    telefone: String(data.telefone || '').trim(),
    email: String(data.email || '').trim(),
    origem: String(data.origem || '').trim(),
    artigo: String(data.artigo || '').trim(),
    artigo_url: String(data.artigo_url || '').trim(),
    enviar_estudo: data.enviar_estudo === true || data.enviar_estudo === 'true'
  };

  var estudoEnviado = false;
  try {
    if (registro.enviar_estudo && registro.email && registro.artigo_url) {
      estudoEnviado = enviarEstudo_(registro);
    }
  } catch (errMail) {
    // Não deixa a falha no e-mail impedir a gravação do cadastro.
    estudoEnviado = false;
  }

  try {
    gravarCadastro_(registro, estudoEnviado);
  } catch (errSheet) {
    return json_({ ok: false, error: 'sheet', detail: String(errSheet) });
  }

  return json_({ ok: true, estudo_enviado: estudoEnviado });
}

function doGet() {
  return json_({ ok: true, service: 'ABREV cadastro', time: new Date().toISOString() });
}

// ===================== PLANILHA =====================
function gravarCadastro_(r, estudoEnviado) {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não encontrada. Defina CONFIG.SHEET_ID.');
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  sheet.appendRow([
    new Date(),
    r.nome,
    r.telefone,
    r.email,
    r.origem,
    r.artigo,
    r.artigo_url,
    estudoEnviado ? 'sim' : 'não'
  ]);
}

// ===================== E-MAIL DO ESTUDO =====================
function enviarEstudo_(r) {
  var slug = slugFromUrl_(r.artigo_url);
  if (!slug) return false;

  var htmlUrl = CONFIG.SITE_BASE + CONFIG.ESTUDOS_PATH + slug + '.html';
  var pdfUrl = CONFIG.SITE_BASE + CONFIG.ESTUDOS_PATH + slug + '.pdf';

  // Corpo do e-mail: HTML reduzido do estudo (com fallback se não existir ainda).
  var htmlBody = fetchText_(htmlUrl);
  if (!htmlBody) {
    htmlBody =
      '<div style="font-family:Arial,sans-serif;color:#183545;line-height:1.6">' +
      '<p>Olá' + (r.nome ? ', ' + escapeHtml_(r.nome.split(' ')[0]) : '') + '!</p>' +
      '<p>Obrigado por fazer parte da comunidade ABREV. Segue o estudo:</p>' +
      '<p><strong>' + escapeHtml_(r.artigo || 'Estudo ABREV') + '</strong></p>' +
      '<p><a href="' + r.artigo_url + '">Ler o estudo completo no site →</a></p>' +
      '<p>— ABREV · Associação Brasileira de Reversa do Varejo</p>' +
      '</div>';
  }

  var options = {
    name: CONFIG.SENDER_NAME,
    replyTo: CONFIG.REPLY_TO,
    htmlBody: htmlBody
  };

  // Anexo PDF, se disponível.
  var pdfBlob = fetchPdf_(pdfUrl, slug);
  if (pdfBlob) {
    options.attachments = [pdfBlob];
  }

  var subject = CONFIG.EMAIL_SUBJECT_PREFIX + (r.artigo || 'Logística reversa no varejo');

  MailApp.sendEmail(
    r.email,
    subject,
    'Seu estudo ABREV está disponível. Abra em um leitor com HTML para visualizar.',
    options
  );
  return true;
}

// ===================== UTILITÁRIOS =====================
function slugFromUrl_(url) {
  try {
    var path = url.split('?')[0].split('#')[0];
    var last = path.substring(path.lastIndexOf('/') + 1);
    return last.replace(/\.html?$/i, '').trim();
  } catch (e) {
    return '';
  }
}

function fetchText_(url) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) return res.getContentText('UTF-8');
  } catch (e) {}
  return '';
}

function fetchPdf_(url, slug) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) {
      var blob = res.getBlob();
      var ct = String(blob.getContentType() || '');
      if (ct.indexOf('pdf') !== -1) {
        return blob.setName('ABREV-' + slug + '.pdf');
      }
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
