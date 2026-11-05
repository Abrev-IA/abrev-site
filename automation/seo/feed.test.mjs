import test from 'node:test';
import assert from 'node:assert/strict';
import {entryFor,renderFeed,generateFeed} from './feed.mjs';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const date='2026-01-02T10:00:00Z';
const page=(path,meta='')=>`<head><link rel="canonical" href="https://abrev.org/${path}"><meta content='Pesquisa &amp; operação "reversa"' name="description">${meta}</head><h1>Reversa &amp; varejo &#8212; <em>guia</em></h1>`;

test('includes only canonical public blog articles, never index, private pages or study copies',()=>{
 const path='blog/guia.html';
 assert.equal(entryFor(path,page(path),date).title,'Reversa & varejo — guia');
 for(const path of ['index.html','blog/index.html','blog/estudos/copia.html','imprensa/noticia.html'])assert.equal(entryFor(path,page(path),date),null);
 assert.equal(entryFor(path,page(path,'<meta name="robots" content="noindex">'),date),null);
 assert.equal(entryFor(path,page(path,'<meta http-equiv="refresh" content="0;url=/">'),date),null);
 assert.equal(entryFor(path,page('blog/outro.html'),date),null);
 assert.throws(()=>entryFor(path,page(path)),/Data Git ausente/);
 assert.throws(()=>entryFor(path,'<head><link rel="canonical" href="https://abrev.org/blog/guia.html"></head>',date),/Título H1/);
});

test('stable identifiers, XML escaping and order; no regenerated dates',()=>{
 const older=entryFor('blog/a.html',page('blog/a.html'),date);
 const newer=entryFor('blog/b.html',page('blog/b.html'),'2026-02-03T12:00:00Z');
 const xml=renderFeed([older,newer,older]);
 assert.equal(xml,renderFeed([newer,older]));
 assert.equal((xml.match(/<entry>/g)||[]).length,2);
 assert.ok(xml.indexOf('<id>'+newer.url)<xml.indexOf('<id>'+older.url));
 assert.match(xml,/Reversa &amp; varejo — guia/);
 assert.match(xml,/Pesquisa &amp; operação &quot;reversa&quot;/);
 assert.throws(()=>renderFeed([]),/feed anterior preservado/);
});

test('generator discovers/deletes articles and preserves output when history is untrustworthy',async t=>{
 const root=await mkdtemp(join(tmpdir(),'abrev-feed-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const git=args=>execFileSync('git',args,{cwd:root,env:{...process.env,GIT_AUTHOR_DATE:date,GIT_COMMITTER_DATE:date},stdio:'pipe'}).toString();
 git(['init']);git(['config','user.name','SEO test']);git(['config','user.email','test@example.org']);
 await mkdir(join(root,'blog'));
 for(const name of ['a','b'])await writeFile(join(root,'blog/'+name+'.html'),page('blog/'+name+'.html'));
 git(['add','.']);git(['commit','-m','Articles']);
 assert.equal(await generateFeed(root),2);
 const output=join(root,'blog/feed.xml');const first=await readFile(output,'utf8');
 await generateFeed(root);assert.equal(await readFile(output,'utf8'),first);
 await writeFile(join(root,'blog/a.html'),page('blog/a.html')+'Changed');
 await assert.rejects(generateFeed(root),/faça commit/);
 assert.equal(await readFile(output,'utf8'),first);
 git(['checkout','--','blog/a.html']);git(['rm','blog/b.html']);git(['commit','-m','Remove article']);
 assert.equal(await generateFeed(root),1);
 const second=await readFile(output,'utf8');assert.equal(second.includes('/blog/b.html'),false);
 await writeFile(join(root,'.git/shallow'),git(['rev-parse','HEAD']).trim()+'\n');
 await assert.rejects(generateFeed(root),/Histórico Git incompleto/);
 assert.equal(await readFile(output,'utf8'),second);
});
