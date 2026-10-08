// Shared domain rules, independent of hosting and UI.
export const FLOWS = {
  biblioteca: { name: 'Biblioteca Técnica', role: 'Bibliotecário técnico', fields: ['Tratamento solicitado', 'Título do Material/Tema da Pesquisa', 'Origem e autoria', 'Arquivo da fonte', 'Pergunta e recorte da pesquisa'], output: 'Extração fiel e nota técnica, ou pesquisa conforme tratamento. Exploratório nunca é incorporado na Biblioteca nem no Catálogo.' },
  conteudo: { name: 'Conteúdo e Publicação', role: 'Redator e planejador editorial', fields: ['Objetivo da publicação', 'Canais', 'Formatos', 'Fonte técnica', 'Mídia de apoio', 'Dimensões da arte', 'Páginas do carrossel'], output: 'Textos finais por canal/formato, CTA, fontes e plano visual. Artes solicitadas exigem PNG real produzido pelo Designer e auditoria visual independente antes da entrega final.' },
  simulacao: { name: 'Simulação Multiagente ABREV', role: 'Analista de cenários multiagente', fields: [], output: 'Cenários, perspectivas dos atores, rodadas solicitadas, efeitos, hipóteses e limitações. Simulação não é pesquisa factual nem execução do MiroFish.' },
  pesquisa: { name: 'Pesquisa e Inteligência', role: 'Pesquisador', fields: ['Pergunta de pesquisa', 'Recorte e contexto', 'Profundidade', 'Fontes obrigatórias'], output: 'Síntese executiva, evidências, referências e lacunas. Não substituir por simulação.' },
  site_update: { name: 'Atualização do Site/Blog', role: 'Editor do site institucional', fields: ['Destino', 'Título', 'Tipo de alteração', 'Alteração solicitada', 'Conteúdo ou referência atual', 'Arquivo de apoio'], output: 'Conteúdo final e escopo preciso. Separar texto publicável de pareceres e notas internas; nunca publicar o relatório de auditoria como artigo.' },
  documento: { name: 'Documento Institucional', role: 'Redator institucional', fields: ['Tipo de documento', 'Objetivo e destinatário', 'Conteúdo obrigatório', 'Formatos de entrega'], output: 'Conteúdo institucional completo. Não afirmar que produziu PDF, DOCX ou PPTX se não houver arquivo real.' },
  community: { name: 'Community Management', role: 'Analista de interações', fields: ['Canal', 'Conteúdo recebido', 'Contexto', 'Modo de operação'], output: 'Classificação, risco, resposta sugerida e encaminhamento. Não enviar mensagens nem apagar comentários sem conector real.' },
};
export function flowDefinition(key) {
  if (!Object.hasOwn(FLOWS, key)) throw new Error('Fluxo desconhecido. Nenhum agente foi acionado.');
  return FLOWS[key];
}
export function describePayload(key, payload) {
  const flow = flowDefinition(key);
  return Object.entries(payload).filter(([k])=>k!=='97').map(([k, v]) => `${k === '99' ? 'Respostas complementares fornecidas pelo solicitante' : k === '98' ? 'Comentários de ajuste do solicitante — aplicar na nova versão' : flow.fields[Number(k)] || k}: ${String(v ?? 'N/A')}`).join('\n');
}
export function revisionPayload(payload, feedback) {
  if (typeof feedback !== 'string' || !feedback.trim() || feedback.length > 4000) throw new Error('Descreva os ajustes em até 4.000 caracteres.');
  return {...payload,97:crypto.randomUUID(),98:[payload[98],feedback.trim()].filter(Boolean).join('\n\nNovo pedido de ajuste:\n')};
}
export function parseClarifications(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Triagem inválida. Nenhum agente de produção foi iniciado.'); }
  if (!value || !Array.isArray(value.questions) || value.questions.length > 8 || value.questions.some(q => !q || typeof q.id !== 'string' || !/^[a-z][a-z0-9_]{0,49}$/.test(q.id) || typeof q.question !== 'string' || !q.question.trim() || q.question.length > 500 || typeof q.reason !== 'string' || !q.reason.trim()) || new Set(value.questions.map(q=>q.id)).size !== value.questions.length) {
    throw new Error('Perguntas da triagem inválidas. A produção permanece bloqueada.');
  }
  return value.questions;
}
export function libraryTreatment(payload) {
  const modes = String(payload[0] || '').split('\n').filter(Boolean);
  const exploratory = modes.some(x => /exploratória/i.test(x));
  if (!modes.length) throw new Error('Selecione um tratamento para a Biblioteca Técnica.');
  if (exploratory && modes.length > 1) throw new Error('Pesquisa exploratória não pode ser combinada com inclusão na Biblioteca.');
  return { exploratory, include: !exploratory, modes };
}
export function validatePayload(key, payload) {
  flowDefinition(key);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Briefing inválido.');
  if (key === 'biblioteca') libraryTreatment(payload);
  if (key === 'simulacao') {
    if (!String(payload.topic || '').trim()) throw new Error('Informe o tema da simulação.');
    if (!Number.isInteger(payload.rounds) || payload.rounds < 1 || payload.rounds > 20) throw new Error('Rodadas devem estar entre 1 e 20.');
  } else if (!Object.values(payload).some(v => String(v || '').trim())) throw new Error('Preencha o briefing.');
}
export function parseAudit(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Parecer do Auditor inválido: aprovação bloqueada.'); }
  if (!value || !['APROVADO', 'DEVOLVIDO'].includes(value.decision) || !Number.isFinite(value.score) || value.score < 0 || value.score > 100 || !Array.isArray(value.corrections) || !value.corrections.every(x => typeof x === 'string') || typeof value.reason !== 'string' || !value.reason.trim()) throw new Error('Parecer do Auditor incompleto: aprovação bloqueada.');
  // Even a model returning APROVADO cannot bypass the score and correction gates.
  const approved = value.decision === 'APROVADO' && value.score >= 90 && value.corrections.length === 0;
  return { ...value, decision: approved ? 'APROVADO' : 'DEVOLVIDO', approved };
}
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
// Visual approval requires evidence for every acceptance criterion, not only a score.
export function parseVisualAudit(text) {
  const verdict = parseAudit(text);
  const required = ['briefing', 'exactText', 'dates', 'legibility', 'officialLogo', 'layout', 'graphicContent', 'visualHierarchy', 'composition', 'finish', 'backgroundPreservation','spaceUse','topicCoherence'];
  const checks = verdict.checks;
  if (!checks || required.some(key => !checks[key] || typeof checks[key].passed !== 'boolean' || typeof checks[key].evidence !== 'string' || !checks[key].evidence.trim()) || typeof verdict.transcription !== 'string' || !verdict.transcription.trim()) {
    throw new Error('Auditoria visual sem transcrição ou evidências por critério. Aprovação bloqueada.');
  }
  const failures = required.filter(key => !checks[key].passed);
  const approved = verdict.approved && failures.length === 0;
  return { ...verdict, approved, decision: approved ? 'APROVADO' : 'DEVOLVIDO', corrections: [...verdict.corrections, ...failures.map(key => `${key}: ${checks[key].evidence}`)] };
}
// Each creator revision must be re-audited. No human approval transition exists.
export async function runAuditedPipeline({ create, audit, record, maxAttempts = 3 }) {
  let previous = '';
  let corrections = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await create(previous, corrections);
    const verdict = parseAudit(await audit(content));
    const contentHash = await digest(content);
    await record({ attempt, content, contentHash, verdict });
    if (verdict.approved) return { content, contentHash, verdict, attempt };
    previous = content;
    corrections = [verdict.reason, ...verdict.corrections];
  }
  return null;
}
