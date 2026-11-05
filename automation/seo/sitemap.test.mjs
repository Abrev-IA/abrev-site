import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalFor,renderSitemap} from './sitemap.mjs';
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
