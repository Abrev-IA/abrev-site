/**
 * ABREV — Notificação de solicitação de associação
 *
 * Script VINCULADO AO GOOGLE FORMS "Quer se tornar associado" (aba Comunidade).
 * A cada envio do formulário, manda um e-mail para a diretoria avaliar, com
 * todas as respostas e o "responder para" já apontando para o candidato.
 *
 * COMO INSTALAR
 *   1. Abra o Formulário → menu ⋮ (canto sup. direito) → "Editor de scripts"
 *      (ou Extensões → Apps Script, dependendo da conta).
 *   2. Cole este arquivo e salve.
 *   3. Rode UMA vez a função `instalarAcionador` (menu ▶) e autorize os escopos.
 *      Isso cria o gatilho "ao enviar formulário". (Alternativa manual: Acionadores
 *      → Adicionar acionador → função onFormSubmit, evento "Ao enviar formulário".)
 *   4. Faça um envio de teste e confira a caixa de `DESTINO`.
 */

var CONFIG = {
  DESTINO: 'administradorabrev@gmail.com',     // quem recebe/avalia as solicitações (por enquanto)
  ASSUNTO: 'Nova solicitação de associação — ABREV',
  REMETENTE_NOME: 'ABREV — Associação Brasileira de Reversa do Varejo',
  FROM_EMAIL: 'adm@abrev.org',                 // alias "Enviar como" VERIFICADO (senão o Google ignora)
  REPLY_TO: 'adm@abrev.org',
  E3_ASSUNTO: 'Recebemos sua candidatura para associar-se à ABREV'
};

// Disparada automaticamente a cada envio do formulário (gatilho instalável).
function onFormSubmit(e) {
  var resp = e && e.response;
  if (!resp) return;

  var itens = resp.getItemResponses();
  var linhas = [], nome = '', emailCandidato = '';
  for (var i = 0; i < itens.length; i++) {
    var titulo = itens[i].getItem().getTitle();
    var val = itens[i].getResponse();
    if (Object.prototype.toString.call(val) === '[object Array]') val = val.join(', ');
    val = String(val == null ? '' : val);
    linhas.push('<tr>' +
      '<td style="padding:6px 12px;border:1px solid #e5eaed;font-weight:bold;color:#153244;vertical-align:top">' + escapeHtml_(titulo) + '</td>' +
      '<td style="padding:6px 12px;border:1px solid #e5eaed;color:#153244">' + escapeHtml_(val) + '</td></tr>');
    var t = String(titulo).toLowerCase();
    if (!emailCandidato && t.indexOf('mail') !== -1 && val.indexOf('@') !== -1) emailCandidato = val;
    if (!nome && t.indexOf('nome') !== -1) nome = val;
  }
  // fallback: e-mail coletado automaticamente pelo Forms
  if (!emailCandidato) { try { emailCandidato = resp.getRespondentEmail() || ''; } catch (err) {} }

  var corpo = '<div style="font-family:Arial,Helvetica,sans-serif;color:#153244;line-height:1.6;max-width:640px">' +
    '<h2 style="color:#153244;margin:0 0 6px">Nova solicitação de associação</h2>' +
    '<p style="color:#607581;margin:0 0 16px">Recebida pelo formulário "Quer se tornar associado" do site ABREV.</p>' +
    '<table style="border-collapse:collapse;width:100%;font-size:14px">' + linhas.join('') + '</table>' +
    (emailCandidato ? '<p style="margin:16px 0 0">Responder diretamente ao candidato: <a href="mailto:' + escapeHtml_(emailCandidato) + '">' + escapeHtml_(emailCandidato) + '</a></p>' : '') +
    '</div>';

  var options = { htmlBody: corpo, name: CONFIG.REMETENTE_NOME };
  if (CONFIG.FROM_EMAIL) options.from = CONFIG.FROM_EMAIL;
  if (emailCandidato) options.replyTo = emailCandidato;  // "responder" vai ao candidato

  MailApp.sendEmail(CONFIG.DESTINO, CONFIG.ASSUNTO + (nome ? (' — ' + nome) : ''),
    'Nova solicitação de associação. Abra em um leitor com HTML para visualizar.', options);

  // E3 — confirmação de candidatura para o próprio candidato
  if (emailCandidato) { try { enviarE3_(emailCandidato, nome); } catch (e3) {} }
}

// E3 — Candidatura recebida (texto PROVISÓRIO, revisão pendente)
function enviarE3_(email, nome) {
  var inner =
    '<p>Olá, ' + escapeHtml_(primeiroNome_(nome)) + '!</p>' +
    '<p>Obrigada pelo interesse em fazer parte da ABREV — Associação Brasileira de Reversa do Varejo.</p>' +
    '<p>Recebemos sua candidatura. A diretoria da ABREV vai analisar seu perfil e entrará em contato após a análise.</p>' +
    '<p>Se quiser complementar alguma informação, basta responder a este e-mail.</p>' +
    '<p>Atenciosamente,<br>Diretoria ABREV</p>';
  var html =
    '<div style="margin:0;background:#fbf8f0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#153244">' +
      '<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 34px rgba(21,50,68,.08)">' +
        '<div style="background:#153244;padding:20px 28px;color:#fff;font-weight:bold;letter-spacing:1px">ABREV</div>' +
        '<div style="padding:28px;line-height:1.6;font-size:15px">' + inner + '</div>' +
      '</div>' +
    '</div>';
  var options = { htmlBody: html, name: CONFIG.REMETENTE_NOME, replyTo: CONFIG.REPLY_TO };
  if (CONFIG.FROM_EMAIL) options.from = CONFIG.FROM_EMAIL;
  MailApp.sendEmail(email, CONFIG.E3_ASSUNTO, 'Recebemos sua candidatura. Abra em um leitor com HTML para visualizar.', options);
}

function primeiroNome_(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }

// Rode uma vez para criar o gatilho "ao enviar formulário".
function instalarAcionador() {
  var form = FormApp.getActiveForm();
  // evita duplicar o gatilho se já existir
  var gatilhos = ScriptApp.getProjectTriggers();
  for (var i = 0; i < gatilhos.length; i++) {
    if (gatilhos[i].getHandlerFunction() === 'onFormSubmit') return 'Gatilho já existente.';
  }
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
  return 'Gatilho criado com sucesso.';
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
