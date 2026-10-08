import {pathToFileURL} from 'node:url';
import {createHash,verify} from 'node:crypto';
const BASE='https://abrev-agentes.tiny-book-1851.chatgpt.site',REPO='Abrev-IA/abrev-site';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function checkedNewsletter(envelope,key){
 if(typeof envelope?.data!=='string'||typeof envelope.signature!=='string'||!verify(null,Buffer.from(envelope.data),key,Buffer.from(envelope.signature,'base64')))throw Error('Assinatura inválida.');
 const p=JSON.parse(envelope.data);
 if(p.version!==1||p.purpose!=='newsletter'||p.repository!==REPO||!/^[-a-f0-9]{36}$/.test(p.publicationId)||!/^([a-f0-9]{64})$/.test(p.contentHash)||!/^([a-f0-9]{64})$/.test(p.htmlHash)||p.campaignId!==p.publicationId+'-'+p.contentHash||!/^[-a-z0-9]+$/.test(p.slug)||p.url!==`https://abrev.org/blog/${p.slug}.html`||!Number.isFinite(Date.parse(p.requestedAt)))throw Error('Solicitação de newsletter inválida.');
 return p;
}
// Persist the claim before calling the mail service. An existing claim NEVER
// causes another broadcast, including timeouts or missing receipts.
export async function processCampaign(p,{read,write,article,diagnostic,broadcast,workflowRunId,now=()=>new Date().toISOString()}){
 const claimPath='automation/newsletter/claims/'+p.campaignId+'.json',receiptPath='automation/newsletter/receipts/'+p.campaignId+'.json';
 const existing=await read(receiptPath);if(existing)return existing;
 const claim=await read(claimPath);
 let started=false,receipt={campaignId:p.campaignId,publicationId:p.publicationId,contentHash:p.contentHash,workflowRunId:String(workflowRunId),at:now()};
 if(claim){receipt={...receipt,state:'INCERTO',reason:'Solicitação já registrada sem comprovante final. Nenhum reenvio automático.'};}
 else{
  await write(claimPath,{campaignId:p.campaignId,publicationId:p.publicationId,contentHash:p.contentHash,workflowRunId:String(workflowRunId),at:now()});
  try{
   const html=await article(p.url);if(hash(html)!==p.htmlHash||!html.includes(`<!-- ABREV_COCKPIT:${p.publicationId}:${p.contentHash} -->`))throw Error('Artigo atual diverge da versão solicitada.');
   const diag=await diagnostic(p.slug);if(diag.ok!==true||!Number.isFinite(diag.cota_restante)||diag.cota_restante<1)throw Error('Endpoint ou cota de envio indisponível.');
   started=true;const result=await broadcast(p.slug),b=result.broadcast;
   if(result.ok!==true||!b||![b.ativos,b.enviados,b.sem_cota,b.cota_restante].every(n=>Number.isInteger(n)&&n>=0)||b.enviados>b.ativos)throw Error('Disparo sem comprovante válido.');
   receipt={...receipt,state:b.enviados===b.ativos&&b.sem_cota===0?'ENVIADA':'PARCIAL',active:b.ativos,sent:b.enviados,quotaSkipped:b.sem_cota,quotaRemaining:b.cota_restante};
  }catch{receipt={...receipt,state:started?'INCERTO':'BLOQUEADA',reason:started?'Resposta do disparo não confirmada. Não reenviar automaticamente.':'Validação anterior ao disparo falhou. Nenhum envio iniciado.'};}
 }
 await write(receiptPath,receipt);return receipt;
}
async function main(){
 const token=process.env.GITHUB_TOKEN,key=process.env.PUBLISH_PUBLIC_KEY,url=process.env.EXEC_URL,secret=process.env.KEY;
 if(!token||!key||!url||!secret)throw Error('Segredos da newsletter não configurados.');
 const api=async(path,method='GET',body)=>{const r=await fetch('https://api.github.com/repos/'+REPO+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(method==='GET'&&r.status===404)return null;if(!r.ok)throw Error('Operação GitHub não confirmada: HTTP '+r.status);return r.status===204?null:r.json();};
 const read=async path=>{const f=await api('/contents/'+path+'?ref=main');return f?JSON.parse(Buffer.from(f.content,'base64').toString()):null;};
 const write=async(path,body)=>api('/contents/'+path,'PUT',{message:'Registrar newsletter solicitada pelo frontend [cockpit:no-broadcast]',branch:'main',content:Buffer.from(JSON.stringify(body,null,2)).toString('base64')});
 const q=await fetch(BASE+'/api/newsletter/queue',{signal:AbortSignal.timeout(120000)});if(!q.ok)throw Error('Fila da newsletter indisponível.');const {jobs}=await q.json();if(!Array.isArray(jobs)||jobs.length>10)throw Error('Fila inválida.');console.log('Solicitações de envio:',jobs.length);
 for(const envelope of jobs){const p=checkedNewsletter(envelope,key);
  const result=await processCampaign(p,{read,write,workflowRunId:process.env.GITHUB_RUN_ID,
   article:async address=>{const r=await fetch(address+'?campaign='+p.campaignId,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Artigo indisponível');return r.text();},
   diagnostic:async slug=>{const u=new URL(url);u.searchParams.set('diag','1');u.searchParams.set('key',secret);u.searchParams.set('slug',slug);const r=await fetch(u,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Endpoint indisponível');return r.json();},
   broadcast:async slug=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'broadcast',key:secret,slug}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Disparo sem confirmação');return r.json();}
  });console.log(JSON.stringify(result));
 }
}
if(process.env.GITHUB_ACTIONS==='true'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
