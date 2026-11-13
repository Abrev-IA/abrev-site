import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function planPublication(item,index,existing,now=new Date()) {
 if(item.id!=='newsletter-2026-11-27'||item.path!=='blog/black-friday-e-a-onda-de-devolucoes.html'||item.publishAt!=='2026-11-27T07:00:00-03:00')throw Error('Pacote inesperado.');
 if(now.getTime()<Date.parse(item.publishAt))return null;
 const marker='<!-- ABREV_NEWSLETTER:2026-11-27 -->';
 if(existing!==null){
  if(existing===item.html&&index.includes('data-newsletter="2026-11-27"'))return null;
  throw Error('Destino já existente ou publicação incompleta; revisão necessária. Nada sobrescrito.');
 }
 if(index.includes('black-friday-e-a-onda-de-devolucoes.html'))throw Error('Já existe referência desta edição no índice.');
 if(!item.html.includes(marker)||!item.html.includes('<h1>Black Friday e a onda de devoluções</h1>')||!index.includes('<main id="feed" class="wrap feed">'))throw Error('Pacote ou índice inválido.');
 return {html:item.html,index:index.replace('<main id="feed" class="wrap feed">','<main id="feed" class="wrap feed">\n'+item.card+'\n')};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const item=JSON.parse(await readFile('automation/blog/scheduled/2026-11-27.json','utf8'));
 const existing=await readFile(item.path,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const result=planPublication(item,await readFile('blog/index.html','utf8'),existing);
 if(!result){console.log('Sem publicação: ainda não chegou a data ou edição já publicada.');}
 else{
  await writeFile(item.path,result.html);
  await writeFile('blog/index.html',result.index);
  console.log('Edição de 27/11 preparada para publicação no blog. Nenhum disparo de email.');
 }
}
