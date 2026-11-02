import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import {parseAudit} from '../blog/workflow-policy.mjs';
export const REPO='Abrev-IA/abrev-site';
export const GRAPH='https://graph.facebook.com/v21.0';
// Mídia só pode vir do próprio site: uma entrada da fila não aponta para fora.
export const MEDIA_HOST='abrev.org';
const KINDS={image:1,carousel:1,video:1,story:1};

export function checkedMedia(url){
 let parsed;
 try{parsed=new URL(url);}catch{throw Error('URL de mídia inválida: '+url);}
 if(parsed.protocol!=='https:'||parsed.hostname!==MEDIA_HOST)throw Error('Mídia fora de https://'+MEDIA_HOST+': '+url);
 return parsed.href;
}

// O veredito do Auditor é o gate: parseAudit já rebaixa qualquer APROVADO fora do limiar.
export function checkedItem(item){
 if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Item da fila inválido.');
 if(!/^[-a-f0-9]{36}$/.test(item.id||''))throw Error('Item sem id válido.');
 if(!Object.hasOwn(KINDS,item.kind))throw Error('Formato desconhecido em '+item.id+'. Nada foi publicado.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(item.scheduledFor||''))throw Error('Data de agendamento inválida em '+item.id+'.');
 if(item.caption!=null&&(typeof item.caption!=='string'||item.caption.length>2200))throw Error('Legenda acima do limite do Instagram em '+item.id+'.');
 const media=(item.media||[]).map(checkedMedia);
 if(item.kind==='carousel'){if(media.length<2||media.length>10)throw Error('Carrossel exige de 2 a 10 imagens em '+item.id+'.');}
 else if(media.length!==1)throw Error('Formato '+item.kind+' exige exatamente uma mídia em '+item.id+'.');
 if(item.kind==='story'&&item.caption)throw Error('Story não aceita legenda em '+item.id+'.');
 const verdict=parseAudit(JSON.stringify(item.audit??null));
 if(!verdict.approved)throw Error('Item '+item.id+' sem aprovação do Auditor. Publicação bloqueada.');
 return {...item,media,verdict};
}

export function duePending(queue,receipts,today){
 if(!Array.isArray(queue))throw Error('Fila inválida.');
 if(queue.length>25)throw Error('Fila acima do limite de 25 itens.');
 const seen=new Set();
 return queue.map(checkedItem).filter(item=>{
  if(seen.has(item.id))throw Error('Item duplicado na fila: '+item.id);
  seen.add(item.id);
  return item.scheduledFor<=today&&!receipts.has(item.id);
 });
}

const api=async(path,method='GET',body)=>{
 const r=await fetch(GRAPH+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
 const payload=await r.json().catch(()=>null);
 if(!r.ok)throw Error('Graph '+method+' '+path.split('?')[0]+' HTTP '+r.status+' '+(payload?.error?.message||''));
 return payload;
};

async function container(igUser,token,params){
 const query=new URLSearchParams({...params,access_token:token});
 return (await api('/'+igUser+'/media?'+query,'POST')).id;
}

// Reels e vídeo são assíncronos: publicar antes de FINISHED devolve erro na Graph.
async function awaitFinished(id,token){
 for(let attempt=0;attempt<30;attempt++){
  const {status_code:status}=await api('/'+id+'?fields=status_code&access_token='+token);
  if(status==='FINISHED')return;
  if(status==='ERROR')throw Error('Processamento da mídia falhou no Instagram: '+id);
  await new Promise(done=>setTimeout(done,10000));
 }
 throw Error('Tempo esgotado aguardando o Instagram processar '+id+'.');
}

export async function publishItem(item,igUser,token){
 let creation;
 if(item.kind==='carousel'){
  const children=[];
  for(const image of item.media)children.push(await container(igUser,token,{image_url:image,is_carousel_item:'true'}));
  creation=await container(igUser,token,{media_type:'CAROUSEL',children:children.join(','),...(item.caption?{caption:item.caption}:{})});
 }else if(item.kind==='image'){
  creation=await container(igUser,token,{image_url:item.media[0],...(item.caption?{caption:item.caption}:{})});
 }else if(item.kind==='video'){
  creation=await container(igUser,token,{media_type:'REELS',video_url:item.media[0],...(item.caption?{caption:item.caption}:{})});
  await awaitFinished(creation,token);
 }else{
  const field=/\.(mp4|mov)$/i.test(item.media[0])?'video_url':'image_url';
  creation=await container(igUser,token,{media_type:'STORIES',[field]:item.media[0]});
  if(field==='video_url')await awaitFinished(creation,token);
 }
 const query=new URLSearchParams({creation_id:creation,access_token:token});
 return (await api('/'+igUser+'/media_publish?'+query,'POST')).id;
}

async function main(){
 const token=process.env.META_TOKEN,igUser=process.env.IG_USER_ID,ghToken=process.env.GITHUB_TOKEN;
 if(!token||!igUser||!ghToken)throw Error('Publicador social não configurado.');
 const live=process.env.SOCIAL_LIVE==='true';
 const gh=async(path,method='GET',body)=>{const r=await fetch('https://api.github.com/repos/'+REPO+path,{method,headers:{Authorization:'Bearer '+ghToken,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(method==='GET'&&r.status===404)return null;if(!r.ok)throw Error('GitHub '+method+' HTTP '+r.status);return r.json();};
 const queue=JSON.parse(await readFile(new URL('./queue.json',import.meta.url),'utf8'));
 const saved=await gh('/contents/automation/social/receipts?ref=main');
 const receipts=new Set((Array.isArray(saved)?saved:[]).map(file=>file.name.replace(/\.json$/,'')));
 const pending=duePending(queue,receipts,new Date().toISOString().slice(0,10));
 console.log(live?'Publicando:':'Ensaio (SOCIAL_LIVE diferente de true):',pending.length);
 for(const item of pending){
  if(!live){console.log('Publicaria',item.kind,item.id,'com',item.media.length,'mídia(s)');continue;}
  const mediaId=await publishItem(item,igUser,token);
  const receipt=JSON.stringify({id:item.id,kind:item.kind,mediaId,scheduledFor:item.scheduledFor,score:item.verdict.score,runId:Number(process.env.GITHUB_RUN_ID),publishedAt:new Date().toISOString()},null,2);
  await gh('/contents/automation/social/receipts/'+item.id+'.json','PUT',{message:`Registrar publicacao social ${item.id} [cockpit:no-broadcast]`,content:Buffer.from(receipt).toString('base64'),branch:'main'});
  console.log('Publicado:',item.id,mediaId);
 }
}
if(process.env.GITHUB_ACTIONS==='true'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
