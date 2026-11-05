import {readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

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
 const urls=[...new Set(files.map(({path,html})=>canonicalFor(path,html)).filter(Boolean))].sort();
 if(!urls.includes(origin+'/'))throw Error('Home canonical ausente; sitemap anterior preservado.');
 const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+escape(url)+'</loc></url>\n').join('')+'</urlset>\n';
}
export async function generate(root) {
 const files=[];
 for(const directory of ['','blog','imprensa']){
  for(const entry of await readdir(join(root,directory),{withFileTypes:true})){
   if(!entry.isFile()||!entry.name.endsWith('.html'))continue;
   const path=(directory?directory+'/':'')+entry.name;
   files.push({path,html:await readFile(join(root,path),'utf8')});
  }
 }
 const xml=renderSitemap(files);
 await writeFile(join(root,'sitemap.xml'),xml);
 return (xml.match(/<loc>/g)||[]).length;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 console.log('Sitemap:',await generate(process.cwd()),'URLs públicas.');
}
