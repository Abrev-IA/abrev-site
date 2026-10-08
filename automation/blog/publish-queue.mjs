import {pathToFileURL} from 'node:url';
import {createHash,verify} from 'node:crypto';
import {parseArticle,articleSlug,insertBlogCard,decodeFile} from './blog-publisher.mjs';
export const BASE='https://abrev-agentes.tiny-book-1851.chatgpt.site';
export const REPO='Abrev-IA/abrev-site';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function checkedEnvelope(envelope,key){
 if(typeof envelope?.data!=='string'||typeof envelope.signature!=='string'||!verify(null,Buffer.from(envelope.data),key,Buffer.from(envelope.signature,'base64')))throw Error('Assinatura da entrega inválida.');
 const p=JSON.parse(envelope.data);
 if(p.version!==1||p.repository!==REPO||p.branch!=='main'||!/^[-a-f0-9]{36}$/.test(p.id)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!/^([a-f0-9]{64})$/.test(p.pdfHash)||hash(p.content)!==p.contentHash||hash(p.html)!==p.htmlHash)throw Error('Manifesto inválido.');
 const article=parseArticle(p.content),slug=p.target?.slug||articleSlug(article.title);
 if(p.url!==`https://abrev.org/blog/${slug}.html`||!p.html.includes(`<!-- ABREV_COCKPIT:${p.id}:${p.contentHash} -->`))throw Error('Destino ou página divergente.');
 if(p.target&&(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.target.slug)||!/^([a-f0-9]{64})$/.test(p.target.previousHtmlHash)||!/^([a-f0-9]{64})$/.test(p.target.previousContentHash)||!/^([a-f0-9]{40})$/.test(p.target.pdfBlobSha)))throw Error('Base de revisão inválida.');
 return {...p,article,slug};
}
export function validateExisting(p,pageHtml,studySha,index,pdfSha){
 const marker=`<!-- ABREV_BLOG_CARD:${p.id} -->`;
 if(pageHtml===p.html&&studySha===pdfSha&&index.includes(marker))return true;
 if(pageHtml||studySha){
  if(!p.target||!pageHtml||hash(pageHtml)!==p.target.previousHtmlHash||!pageHtml.includes(`<!-- ABREV_COCKPIT:${p.id}:${p.target.previousContentHash} -->`)||studySha!==pdfSha||studySha!==p.target.pdfBlobSha||!index.includes(marker))throw Error('Base publicada mudou. Revisão bloqueada para preservar o conteúdo atual.');
 }else if(p.target)throw Error('Artigo original da revisão não encontrado.');
 return false;
}
async function main(){
 const key=process.env.PUBLISH_PUBLIC_KEY,token=process.env.GITHUB_TOKEN;if(!key||!token)throw Error('Publicador não configurado.');
 const api=async(path,method='GET',body)=>{const r=await fetch('https://api.github.com/repos/'+REPO+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});if(method==='GET'&&r.status===404)return null;if(!r.ok)throw Error('GitHub '+method+' '+path.split('?')[0]+' HTTP '+r.status);return r.status===204?null:r.json();};
 const q=await fetch(BASE+'/api/blog/queue',{signal:AbortSignal.timeout(60000)});if(!q.ok)throw Error('Fila indisponível HTTP '+q.status);const {jobs}=await q.json();if(!Array.isArray(jobs)||jobs.length>10)throw Error('Fila inválida.');console.log('Entregas aprovadas:',jobs.length);
 for(const envelope of jobs){
  const p=checkedEnvelope(envelope,key),path=`blog/${p.slug}.html`,pdfPath=`blog/estudos/${p.slug}.pdf`;
  const r=await fetch(BASE+'/api/blog/queue/'+p.id,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('PDF original indisponível.');const pdf=Buffer.from(await r.arrayBuffer());if(hash(pdf)!==p.pdfHash||pdf.subarray(0,5).toString()!=='%PDF-')throw Error('PDF diverge da entrega assinada.');
  const pdfSha=createHash('sha1').update(Buffer.from(`blob ${pdf.length}\0`)).update(pdf).digest('hex');
  const head=await api('/git/ref/heads/main'),parent=head.object.sha,ref='?ref='+parent;
  const [page,study,indexFile,workflow]=await Promise.all([api('/contents/'+path+ref),api('/contents/'+pdfPath+ref),api('/contents/blog/index.html'+ref),api('/contents/.github/workflows/newsletter-broadcast.yml'+ref)]);
  const index=decodeFile(indexFile);if(!decodeFile(workflow).includes('[cockpit:no-broadcast]'))throw Error('Proteção da newsletter ausente.');
  let commitSha=parent;
  const current=validateExisting(p,page?decodeFile(page):null,study?.sha,index,pdfSha);
  if(!current){
   const blob=study||await api('/git/blobs','POST',{encoding:'base64',content:pdf.toString('base64')});
   const parentCommit=await api('/git/commits/'+parent);
   const tree=await api('/git/trees','POST',{base_tree:parentCommit.tree.sha,tree:[{path,mode:'100644',type:'blob',content:p.html},{path:pdfPath,mode:'100644',type:'blob',sha:blob.sha},{path:'blog/index.html',mode:'100644',type:'blob',content:insertBlogCard(index,p.article,p.slug,p.id,p.date)}]});
   const commit=await api('/git/commits','POST',{message:`Publicar entrega aprovada do cockpit [cockpit:no-broadcast]\nProtocolo: ${p.id}`,tree:tree.sha,parents:[parent]});
   if((await api('/git/ref/heads/main')).object.sha!==parent)throw Error('Main mudou. Reprocessar a fila preservando o novo conteúdo.');
   await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});commitSha=commit.sha;console.log('Pacote publicado:',p.id,commitSha);
  }
  const liveGet=async url=>{const response=await fetch(url+'?abrev_verificacao='+commitSha,{signal:AbortSignal.timeout(30000)});return response.ok?response:null;};
  const [livePage,liveIndex,livePdf]=await Promise.all([liveGet(p.url),liveGet('https://abrev.org/blog/'),liveGet('https://abrev.org/'+pdfPath)]);
  const liveHtmlHash=livePage?hash(await livePage.text()):null,livePdfHash=livePdf?hash(Buffer.from(await livePdf.arrayBuffer())):null;
  const cardMarker=`<!-- ABREV_BLOG_CARD:${p.id} -->`,indexConfirmed=liveIndex?(await liveIndex.text()).includes(cardMarker):false;
  const liveVerified=liveHtmlHash===p.htmlHash&&livePdfHash===p.pdfHash&&indexConfirmed;
  const receiptPath='automation/blog/receipts/'+p.id+'-'+p.contentHash+'.json',receipt=JSON.stringify({publicationId:p.id,contentHash:p.contentHash,htmlHash:p.htmlHash,pdfHash:p.pdfHash,url:p.url,live:liveVerified,liveHtmlHash,livePdfHash,indexConfirmed,runId:Number(process.env.GITHUB_RUN_ID),verifiedAt:new Date().toISOString()},null,2);
  const savedReceipt=await api('/contents/'+receiptPath+'?ref=main');
  const previousReceipt=savedReceipt?JSON.parse(decodeFile(savedReceipt)):null;
  if(previousReceipt&&(previousReceipt.contentHash!==p.contentHash||previousReceipt.htmlHash!==p.htmlHash||previousReceipt.pdfHash!==p.pdfHash))throw Error('Comprovante divergente.');
  if(!previousReceipt||(!previousReceipt.live&&liveVerified)){const saved=await api('/contents/'+receiptPath,'PUT',{message:`Registrar entrega verificada do cockpit [cockpit:no-broadcast]`,content:Buffer.from(receipt).toString('base64'),branch:'main',...(savedReceipt?{sha:savedReceipt.sha}:{})});commitSha=saved.commit.sha;console.log('Gravação do publicador confirmada:',p.id,commitSha);}
  console.log('Verificação pública:',p.id,liveVerified);
  const ack=await fetch(BASE+'/api/blog/queue/'+p.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),signal:AbortSignal.timeout(120000)});
  let live=false;if(ack.ok){const evidence=await ack.json();live=evidence.live===true;console.log('Confirmação:',p.id,evidence.state);}
  if(!live){const build=await api('/pages/builds/latest');if(!build||build.commit!==commitSha||build.status==='errored')await api('/pages/builds','POST',{});console.log('Aguardando confirmação do site:',p.id);}
 }
}
if(process.env.GITHUB_ACTIONS==='true'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
