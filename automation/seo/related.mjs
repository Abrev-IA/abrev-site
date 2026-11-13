// Bloco "Continue explorando a reversa": um por artigo, gerado a partir de clusters.json.
// Antes, cada artigo trazia uma lista escrita à mão, com ordem e títulos diferentes.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

export const INICIO='<!-- leia-tambem:inicio -->';
export const FIM='<!-- leia-tambem:fim -->';

export function lerConfig(texto) {
 const config=JSON.parse(texto);
 const artigos=Object.values(config.clusters).flat();
 const vistos=new Set();
 for(const slug of artigos){
  if(vistos.has(slug))throw Error('artigo em mais de um cluster: '+slug);
  vistos.add(slug);
  if(!config.titulos[slug])throw Error('título ausente para '+slug);
 }
 for(const slug of Object.keys(config.titulos))if(!vistos.has(slug))throw Error('título sem cluster: '+slug);
 for(const slug of config.ordemDeCompletar)if(!vistos.has(slug))throw Error('ordemDeCompletar cita artigo desconhecido: '+slug);
 if(!(config.limite>=2))throw Error('limite inválido');
 for(const slug of Object.keys(config.limitePorArtigo||{}))if(!vistos.has(slug))throw Error('limitePorArtigo cita artigo desconhecido: '+slug);
 for(const fixo of config.fixos||[]){
  if(!fixo.href?.startsWith('/')||!fixo.titulo)throw Error('link fixo inválido');
  if(/^\/blog\/[^/]+\.html$/.test(fixo.href))throw Error('link fixo duplica um artigo: '+fixo.href);
 }
 return {...config,artigos};
}

export function limitePara(slug,config) {
 return config.limitePorArtigo?.[slug]??config.limite;
}

// Irmãos do mesmo cluster, depois os hubs, depois a ordem global — sempre determinístico.
export function relacionadosDe(slug,config) {
 const cluster=Object.entries(config.clusters).find(([,membros])=>membros.includes(slug));
 if(!cluster)throw Error('artigo fora dos clusters: '+slug);
 const limite=limitePara(slug,config);
 const escolhidos=[];
 const juntar=lista=>{for(const outro of lista){
  if(outro===slug||escolhidos.includes(outro)||escolhidos.length>=limite)continue;
  escolhidos.push(outro);
 }};
 juntar(cluster[1]);
 juntar(config.clusters.hub);
 juntar(config.ordemDeCompletar);
 if(escolhidos.length<limite)throw Error('artigos insuficientes para completar o bloco de '+slug);
 return escolhidos;
}

export function renderBloco(slug,config) {
 const escapar=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const itens=[
  ...relacionadosDe(slug,config).map(outro=>({href:'/blog/'+outro,titulo:config.titulos[outro]})),
  ...(config.fixos||[]),
 ].map(item=>'<li><a href="'+item.href+'">'+escapar(item.titulo)+'</a></li>').join('\n');
 return INICIO+'\n<h2>'+escapar(config.titulo)+'</h2>\n<ul>\n'+itens+'\n</ul>\n'+FIM;
}

// Substitui o bloco gerado, ou o bloco antigo escrito à mão, ou o parágrafo "Comece pelos fundamentos".
export function aplicarBloco(html,bloco) {
 const alvos=[
  new RegExp(INICIO.replace(/[-[\]{}()*+?.,\\^$|#]/g,'\\$&')+'[\\s\\S]*?'+FIM.replace(/[-[\]{}()*+?.,\\^$|#]/g,'\\$&')),
  /<h2>Continue explorando a reversa<\/h2>\s*<ul>[\s\S]*?<\/ul>/,
  /<p class="guide-related">[\s\S]*?<\/p>/,
 ];
 for(const alvo of alvos){
  const encontrado=html.match(alvo);
  if(!encontrado)continue;
  if(html.match(new RegExp(alvo.source,'g')).length!==1)throw Error('âncora do bloco não é única');
  return html.replace(alvo,()=>bloco);
 }
 const fecha=html.lastIndexOf('</article>');
 if(fecha<0)throw Error('artigo sem </article>');
 return html.slice(0,fecha)+bloco+'\n'+html.slice(fecha);
}

export async function aplicar(root,{conferir=false}={}) {
 const config=lerConfig(await readFile(join(root,'automation/seo/clusters.json'),'utf8'));
 const desatualizados=[];
 let escritos=0;
 for(const slug of config.artigos){
  const caminho=join(root,'blog',slug);
  const html=await readFile(caminho,'utf8');
  const crlf=html.includes('\r\n');
  const bloco=crlf?renderBloco(slug,config).replace(/\n/g,'\r\n'):renderBloco(slug,config);
  const novo=aplicarBloco(html,bloco);
  if(novo===html)continue;
  desatualizados.push(slug);
  if(conferir)continue;
  await writeFile(caminho,novo);
  escritos++;
 }
 return {total:config.artigos.length,desatualizados,escritos};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const conferir=process.argv.includes('--check');
 const {total,desatualizados,escritos}=await aplicar(process.cwd(),{conferir});
 if(conferir&&desatualizados.length){
  console.error('Bloco "leia também" desatualizado em:\n  '+desatualizados.join('\n  ')+'\nRode: node automation/seo/related.mjs');
  process.exit(1);
 }
 console.log('Leia também:',total,'artigos conferidos,',conferir?0:escritos,'atualizados.');
}
