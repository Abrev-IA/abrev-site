import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {canonicalFor,lastmodFor} from './sitemap.mjs';
const run=promisify(execFile);
const feedURL='https://abrev.org/blog/feed.xml';
const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function text(value) {
 const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—'};
 return value.replace(/<[^>]*>/g,'').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(entity,key)=>{
  if(key[0]!=='#')return entities[key.toLowerCase()]??entity;
  const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
  return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):entity;
 }).replace(/\s+/g,' ').trim();
}
export function entryFor(path,html,updated) {
 if(!/^blog\/(?!index\.html$)[^/]+\.html$/.test(path))return null;
 const url=canonicalFor(path,html);
 if(!url)return null;
 const title=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 let summary='';
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 for(const match of head.matchAll(/<meta\b[^>]*>/gi)){
  const attrs={};
  for(const a of match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[a[1].toLowerCase()]=a[2]??a[3]??a[4];
  if(attrs.name?.toLowerCase()==='description')summary=text(attrs.content||'');
 }
 if(!title||!summary)throw Error('Título H1 ou descrição ausente no feed: '+path);
 if(!updated||!/^\d{4}-\d{2}-\d{2}T/.test(updated)||!Number.isFinite(Date.parse(updated)))throw Error('Data Git ausente/inválida; faça commit do HTML antes de gerar o feed: '+path);
 return {url,title,summary,updated};
}
export function renderFeed(entries) {
 const sorted=[...new Map(entries.filter(Boolean).map(entry=>[entry.url,entry])).values()]
  .sort((a,b)=>Date.parse(b.updated)-Date.parse(a.updated)||a.url.localeCompare(b.url,'en'));
 if(!sorted.length)throw Error('Blog sem artigos públicos; feed anterior preservado.');
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="pt-BR">\n'+
 '  <id>'+feedURL+'</id>\n  <title>Blog ABREV</title>\n'+
 '  <subtitle>Logística reversa, devoluções e experiência do cliente no varejo.</subtitle>\n'+
 '  <link rel="self" type="application/atom+xml" href="'+feedURL+'"/>\n'+
 '  <link rel="alternate" type="text/html" href="https://abrev.org/blog/"/>\n'+
 '  <author><name>ABREV — Associação Brasileira de Reversa do Varejo</name><uri>https://abrev.org/</uri></author>\n'+
 '  <updated>'+escape(sorted[0].updated)+'</updated>\n'+
 sorted.map(entry=>'  <entry>\n    <id>'+escape(entry.url)+'</id>\n'+
 '    <title type="text">'+escape(entry.title)+'</title>\n'+
 '    <link rel="alternate" type="text/html" href="'+escape(entry.url)+'"/>\n'+
 '    <updated>'+escape(entry.updated)+'</updated>\n'+
 '    <summary type="text">'+escape(entry.summary)+'</summary>\n  </entry>\n').join('')+'</feed>\n';
}
export async function generateFeed(root) {
 const {stdout}=await run('git',['rev-parse','--is-shallow-repository'],{cwd:root});
 if(stdout.trim()==='true')throw Error('Histórico Git incompleto; use fetch-depth: 0. Feed anterior preservado.');
 const entries=[];
 for(const file of await readdir(join(root,'blog'),{withFileTypes:true})){
  if(!file.isFile()||!file.name.endsWith('.html')||file.name==='index.html')continue;
  const path='blog/'+file.name;
  const html=await readFile(join(root,path),'utf8');
  if(canonicalFor(path,html))entries.push(entryFor(path,html,await lastmodFor(root,path)));
 }
 const xml=renderFeed(entries);
 const output=join(root,'blog/feed.xml');
 const previous=await readFile(output,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
 await writeFile(output,previous.includes('\r\n')?xml.replace(/\n/g,'\r\n'):xml);
 return entries.length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 console.log('Feed Atom:',await generateFeed(process.cwd()),'artigos públicos.');
}
