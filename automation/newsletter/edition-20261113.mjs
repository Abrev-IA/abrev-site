import {readFile,writeFile} from 'node:fs/promises';
import {processCampaign} from './cockpit-dispatch.mjs';
const p=JSON.parse(await readFile('automation/newsletter/requests/newsletter-2026-11-13.json','utf8'));
const mode=process.env.CAMPAIGN_MODE;
if(!['diagnostic','send'].includes(mode)||p.slug!=='a-reversa-entra-no-planejamento-do-pico')throw Error('Campanha ou modo inválido.');
if(process.env.GITHUB_RUN_ATTEMPT!=='1')throw Error('Reexecução bloqueada. Conferir comprovante antes de qualquer ação.');
const token=process.env.GITHUB_TOKEN,url=process.env.EXEC_URL,key=process.env.KEY;
if(!token||!url||!key)throw Error('Configuração de envio indisponível.');
const api=async(path,method='GET',body)=>{
 const r=await fetch('https://api.github.com/repos/Abrev-IA/abrev-site'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 if(method==='GET'&&r.status===404)return null;
 if(!r.ok)throw Error('Registro GitHub não confirmado: '+r.status);
 return r.status===204?null:r.json();
};
const read=async path=>{const f=await api('/contents/'+path+'?ref=main');return f?JSON.parse(Buffer.from(f.content,'base64').toString()):null;};
const write=async(path,body)=>api('/contents/'+path,'PUT',{message:'Newsletter 13/11: registrar campanha autorizada [cockpit:no-broadcast]',branch:'main',content:Buffer.from(JSON.stringify(body,null,2)).toString('base64')});
const diagnostic=async()=>{
 const u=new URL(url);u.searchParams.set('diag','1');u.searchParams.set('key',key);u.searchParams.set('slug',p.slug);
 const r=await fetch(u,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Diagnóstico indisponível.');
 const d=await r.json();
 console.log(JSON.stringify({mode,communityRecords:d.comunidade,quotaRemaining:d.cota_restante,sender:d.from_email,version:d.version}));
 if(d.ok!==true||d.from_email!=='adm@abrev.org'||!Number.isInteger(d.comunidade)||d.comunidade<1||d.cota_restante<d.comunidade)throw Error('Base, remetente ou cota não confirmados. Nenhum disparo iniciado.');
 return d;
};
if(mode==='diagnostic'){
 const existingClaim=await read('automation/newsletter/claims/'+p.campaignId+'.json');
 const receipt=await read('automation/newsletter/receipts/'+p.campaignId+'.json');
 console.log(JSON.stringify({campaignId:p.campaignId,claimed:!!existingClaim,receipt:receipt||null}));
 await diagnostic();
}else{
 const result=await processCampaign(p,{read,write,workflowRunId:process.env.GITHUB_RUN_ID,
  article:async address=>{const r=await fetch(address+'?newsletter=20261113',{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Artigo não publicado.');const pdf=await fetch('https://abrev.org/blog/estudos/'+p.slug+'.pdf');if(!pdf.ok)throw Error('PDF não publicado.');return r.text();},
  diagnostic,
  broadcast:async slug=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'broadcast',key,slug,titulo:'A reversa entra no planejamento do pico',resumo:'A preparação para a Black Friday também passa pelo retorno dos produtos. Confira o roteiro da ABREV para conectar capacidade operacional, triagem, parceiros e atendimento, com responsabilidades claras e visibilidade sobre cada solicitação.'}),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('Envio não confirmado. Não repetir.');return r.json();}
 });
 await writeFile('newsletter-20261113-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 if(result.state!=='ENVIADA')throw Error('Campanha sem confirmação integral. Não reenviar automaticamente.');
}
