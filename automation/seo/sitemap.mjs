import {readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);

const origin='https://abrev.org';
function attributes(tag) {
 const attrs={};
 for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs[match[1].toLowerCase()]=match[2]??match[3]??match[4];
 return attrs;
}
export function canonicalFor(path,html) {
 // Only public content roots are eligible, never templates, QA or study copies.
 if(!/^(?:[^/]+\.html|(?:blog|imprensa)\/[^/]+\.html)$/.test(path)||/^google[^/]+\.html$/.test(path))return null;
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
 if(!head)return null;
 for(const tag of head.matchAll(/<meta\b[^>]*>/gi)){
  const a=attributes(tag[0]);
  if((a['http-equiv']||'').toLowerCase()==='refresh')return null;
  if(['robots','googlebot'].includes((a.name||'').toLowerCase())&&/\b(?:noindex|none)\b/i.test(a.content||''))return null;
 }
 const candidates=Array.from(head.matchAll(/<link\b[^>]*>/gi),m=>attributes(m[0])).filter(a=>(a.rel||'').toLowerCase().split(/\s+/).includes('canonical'));
 if(candidates.length!==1)return null;
 let url;try{url=new URL(candidates[0].href);}catch{return null;}
 const expected='/'+path.replace(/(?:^|\/)index\.html$/,m=>m.startsWith('/')?'/':'');
 if(url.origin!==origin||url.pathname!==expected||url.search||url.hash)return null;
 return url.href;
}
export function renderSitemap(files) {
 const entries=new Map();
 for(const {path,html,lastmod} of files){
  const url=canonicalFor(path,html);
  if(!url)continue;
  if(lastmod&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(lastmod))throw Error('lastmod inválido: '+path);
  entries.set(url,lastmod);
 }
 const urls=[...entries.keys()].sort();
 if(!urls.includes(origin+'/'))throw Error('Home canonical ausente; sitemap anterior preservado.');
 const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+escape(url)+'</loc>'+(entries.get(url)?'<lastmod>'+escape(entries.get(url))+'</lastmod>':'')+'</url>\n').join('')+'</urlset>\n';
}
// Commit timestamps, never filesystem mtime or the generator's execution date.
export async function lastmodFor(root,path) {
 const {stdout:dirty}=await run('git',['status','--porcelain','--untracked-files=all','--',path],{cwd:root});
 if(dirty.trim())return undefined; // A working copy must not claim an old date for new content.
 const {stdout}=await run('git',['log','-1','--format=%cI','--',path],{cwd:root});
 return stdout.trim()||undefined;
}
export async function generate(root) {
 const {stdout:shallow}=await run('git',['rev-parse','--is-shallow-repository'],{cwd:root});
 if(shallow.trim()==='true')throw Error('Histórico Git incompleto; use fetch-depth: 0. Sitemap anterior preservado.');
 const files=[];
 for(const directory of ['','blog','imprensa']){
  for(const entry of await readdir(join(root,directory),{withFileTypes:true})){
   if(!entry.isFile()||!entry.name.endsWith('.html'))continue;
   const path=(directory?directory+'/':'')+entry.name;
   const html=await readFile(join(root,path),'utf8');
   if(canonicalFor(path,html))files.push({path,html,lastmod:await lastmodFor(root,path)});
  }
 }
 const xml=renderSitemap(files);
 const previous=await readFile(join(root,'sitemap.xml'),'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
 await writeFile(join(root,'sitemap.xml'),previous.includes('\r\n')?xml.replace(/\n/g,'\r\n'):xml);
 return (xml.match(/<loc>/g)||[]).length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 console.log('Sitemap:',await generate(process.cwd()),'URLs públicas.');
}
