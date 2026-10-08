import fs from 'node:fs';
const request=JSON.parse(fs.readFileSync('automation/newsletter/requests/angelo-2026-10-08.json','utf8'));
if(request.slug!=='logistica-reversa-na-era-do-comercio-agentico'||!['diagnostic','send'].includes(request.mode)||request.expectedRecipients!==6)throw Error('Solicitação inválida.');
const url=process.env.EXEC_URL,key=process.env.KEY;
if(!url||!key)throw Error('Segredos da newsletter não configurados.');
async function jsonCall(target,options){const res=await fetch(target,{...options,signal:AbortSignal.timeout(120000)});if(!res.ok)throw Error('Endpoint HTTP '+res.status);const data=await res.json();if(data.ok!==true)throw Error('Endpoint não confirmou operação.');return data;}
const diagUrl=new URL(url);diagUrl.searchParams.set('diag','1');diagUrl.searchParams.set('key',key);diagUrl.searchParams.set('slug',request.slug);
const diag=await jsonCall(diagUrl);
console.log(JSON.stringify({mode:request.mode,version:diag.version,communityRecords:diag.comunidade,quota:diag.cota_restante}));
if(request.mode==='send'){
 if(!Number.isFinite(diag.cota_restante)||diag.cota_restante<request.expectedRecipients)throw Error('Cota insuficiente. Nenhum disparo iniciado.');
 const article=await fetch('https://abrev.org/blog/'+request.slug+'.html');if(!article.ok||(await article.text()).indexOf('ABREV_COCKPIT:5ee38b68-940e-4ede-815c-64a1ec7b75c2:ea8a054a625a890a2fd61cee8935455f23294c8a564499d9102ab8d566e95a42')<0)throw Error('Artigo aprovado não está disponível.');
 const result=await jsonCall(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'broadcast',key,slug:request.slug})});
 const b=result.broadcast;if(!b)throw Error('Comprovante de envio ausente. Não reexecutar automaticamente.');
 const report={campaign:'angelo-2026-10-08',slug:request.slug,at:new Date().toISOString(),active:b.ativos,sent:b.enviados,quotaSkipped:b.sem_cota,quotaRemaining:b.cota_restante};
 fs.writeFileSync('newsletter-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(b.ativos!==request.expectedRecipients||b.enviados!==request.expectedRecipients||b.sem_cota!==0)throw Error('Disparo divergente ou parcial. Conferir comprovante antes de qualquer reexecução.');
}
