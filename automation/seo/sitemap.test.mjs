import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalFor,renderSitemap,generate} from './sitemap.mjs';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const page=(url,extra='')=>`<html><head>${extra}<link rel="canonical" href="${url}"></head><body>Conteúdo</body></html>`;
const home={path:'index.html',html:page('https://abrev.org/')};
test('includes new article and removes deleted one deterministically without duplicate URLs',()=>{
 const article={path:'blog/novo-artigo.html',html:page('https://abrev.org/blog/novo-artigo.html')};
 const xml=renderSitemap([article,home,article]);assert.equal((xml.match(/<loc>/g)||[]).length,2);
 assert.equal(xml,renderSitemap([home,article]));assert.equal(renderSitemap([home]).includes('novo-artigo'),false);
});
test('excludes redirects, noindex, templates, study copies and verification files',()=>{
 assert.equal(canonicalFor('associe-se.html',page('https://abrev.org/colabore.html','<meta http-equiv="refresh" content="0;url=/colabore.html">')),null);
 for(const meta of ['<meta content="noindex, follow" name="robots">',"<meta name='googlebot' content='none'>"])
  assert.equal(canonicalFor('privado.html',page('https://abrev.org/privado.html',meta)),null);
 for(const path of ['qa/teste.html','templates/index.html','blog/estudos/copia.html','google123.html'])
  assert.equal(canonicalFor(path,page('https://abrev.org/'+path)),null);
});
test('accepts canonical index routes, rejects external, ambiguous and tracking canonicals',()=>{
 assert.equal(canonicalFor('blog/index.html',page('https://abrev.org/blog/')),'https://abrev.org/blog/');
 for(const url of ['https://example.org/a.html','https://abrev.org/a.html?email=private','https://abrev.org/a.html#fragment','https://abrev.org/outro.html'])assert.equal(canonicalFor('a.html',page(url)),null);
 assert.equal(canonicalFor('a.html',page('https://abrev.org/a.html','<link rel="canonical" href="https://abrev.org/a.html">')),null);
 assert.throws(()=>renderSitemap([]),/Home canonical ausente/);
});

test('lastmod follows each HTML commit, not rebuilds or sitemap-only commits',async t=>{
 const root=await mkdtemp(join(tmpdir(),'abrev-sitemap-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const git=(args,date)=>execFileSync('git',args,{cwd:root,env:{...process.env,...(date?{GIT_AUTHOR_DATE:date,GIT_COMMITTER_DATE:date}:{})},stdio:'pipe'}).toString();
 git(['init']);git(['config','user.email','test@example.org']);git(['config','user.name','SEO test']);
 await mkdir(join(root,'blog'));await mkdir(join(root,'imprensa'));
 await writeFile(join(root,'index.html'),home.html);
 const article='blog/novo.html';
 await writeFile(join(root,article),page('https://abrev.org/'+article));
 await writeFile(join(root,'sitemap.xml'),'previous\r\n');
 git(['add','.']);git(['commit','-m','Initial content'],'2026-01-02T10:00:00+00:00');
 await writeFile(join(root,article),page('https://abrev.org/'+article)+'Updated content');
 git(['add',article]);git(['commit','-m','Article update'],'2026-02-03T11:00:00+00:00');
 assert.equal(await generate(root),2);
 const xml=await readFile(join(root,'sitemap.xml'),'utf8');
 assert.match(xml,/<loc>https:\/\/abrev.org\/<\/loc><lastmod>2026-01-02T10:00:00(?:Z|\+00:00)<\/lastmod>/);
 assert.match(xml,/<loc>https:\/\/abrev.org\/blog\/novo.html<\/loc><lastmod>2026-02-03T11:00:00(?:Z|\+00:00)<\/lastmod>/);
 assert.equal(xml.replace(/\r\n/g,'').includes('\n'),false);
 git(['add','sitemap.xml']);git(['commit','-m','Sitemap only'],'2026-03-04T12:00:00+00:00');
 await generate(root);assert.equal(await readFile(join(root,'sitemap.xml'),'utf8'),xml);
 await writeFile(join(root,article),page('https://abrev.org/'+article)+'Uncommitted edit');
 await writeFile(join(root,'blog/new.html'),page('https://abrev.org/blog/new.html'));
 await generate(root);
 const dirty=await readFile(join(root,'sitemap.xml'),'utf8');
 assert.match(dirty,/<loc>https:\/\/abrev.org\/blog\/novo.html<\/loc><\/url>/);
 assert.match(dirty,/<loc>https:\/\/abrev.org\/blog\/new.html<\/loc><\/url>/);
 await writeFile(join(root,'.git/shallow'),git(['rev-parse','HEAD']).trim()+'\n');
 await assert.rejects(generate(root),/Histórico Git incompleto/);
 assert.equal(await readFile(join(root,'sitemap.xml'),'utf8'),dirty);
});
