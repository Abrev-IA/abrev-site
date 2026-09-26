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
  DESTINO: 'administradorabrev@gmail.com',    // quem recebe/avalia as solicitações (por enquanto)
  ASSUNTO: 'Nova solicitação de associação — ABREV',
  REMETENTE_NOME: 'ABREV — Site'
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
  if (emailCandidato) options.replyTo = emailCandidato;  // "responder" vai ao candidato

  MailApp.sendEmail(CONFIG.DESTINO, CONFIG.ASSUNTO + (nome ? (' — ' + nome) : ''),
    'Nova solicitação de associação. Abra em um leitor com HTML para visualizar.', options);
}

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
