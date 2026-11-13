import test from 'node:test';
import assert from 'node:assert/strict';
import {lerConfig,relacionadosDe,renderBloco,aplicarBloco,aplicar,limitePara,INICIO,FIM} from './related.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';

const root=new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
const cru=await readFile(join(root,'automation/seo/clusters.json'),'utf8');
const config=lerConfig(cru);

const base={
 titulo:'Continue explorando a reversa',
 limite:3,
 clusters:{hub:['pilar.html','glossario.html'],par:['a.html','b.html'],solo:['c.html']},
 ordemDeCompletar:['a.html','b.html','c.html'],
 titulos:{'pilar.html':'Pilar','glossario.html':'Glossário','a.html':'A','b.html':'B','c.html':'C'},
};
const pequeno=lerConfig(JSON.stringify(base));

test('nunca aponta para si mesmo e respeita o limite exato',()=>{
 for(const slug of config.artigos){
  const lista=relacionadosDe(slug,config);
  assert.equal(lista.includes(slug),false,slug+' aponta para si mesmo');
  assert.equal(lista.length,limitePara(slug,config),slug);
  assert.equal(new Set(lista).size,lista.length,slug+' tem link repetido');
 }
});

test('os hubs apontam para todos os outros artigos',()=>{
 for(const hub of config.clusters.hub){
  const lista=relacionadosDe(hub,config);
  assert.deepEqual(lista.sort(),config.artigos.filter(s=>s!==hub).sort(),hub);
 }
});

test('os links fixos entram em todo bloco e não somem numa regeração',()=>{
 for(const slug of config.artigos){
  const bloco=renderBloco(slug,config);
  for(const fixo of config.fixos)assert.match(bloco,new RegExp('href="'+fixo.href+'"'),slug+' perdeu '+fixo.href);
 }
 assert.throws(()=>lerConfig(JSON.stringify({...base,fixos:[{href:'/blog/a.html',titulo:'A'}]})),/duplica um artigo/);
 assert.throws(()=>lerConfig(JSON.stringify({...base,fixos:[{href:'imprensa',titulo:'X'}]})),/link fixo inválido/);
 assert.throws(()=>lerConfig(JSON.stringify({...base,limitePorArtigo:{'z.html':3}})),/limitePorArtigo cita artigo desconhecido/);
});

test('irmãos do cluster vêm antes dos hubs, e um cluster de um artigo só ainda completa o bloco',()=>{
 assert.deepEqual(relacionadosDe('a.html',pequeno),['b.html','pilar.html','glossario.html']);
 assert.deepEqual(relacionadosDe('c.html',pequeno),['pilar.html','glossario.html','a.html']);
 assert.deepEqual(relacionadosDe('pilar.html',pequeno),['glossario.html','a.html','b.html']);
});

test('a ordem não depende da ordem de chamada e o HTML escapa o título',()=>{
 assert.equal(renderBloco('a.html',pequeno),renderBloco('a.html',lerConfig(cru.length?JSON.stringify(base):cru)));
 const comSinal=lerConfig(JSON.stringify({...base,titulos:{...base.titulos,'b.html':'Trocas & devoluções <br>'}}));
 const bloco=renderBloco('a.html',comSinal);
 assert.match(bloco,/Trocas &amp; devoluções &lt;br&gt;/);
 assert.equal(bloco.includes('<br>'),false);
});

test('config inconsistente é recusada em vez de gerar link quebrado',()=>{
 const repetido={...base,clusters:{...base.clusters,solo:['c.html','a.html']}};
 assert.throws(()=>lerConfig(JSON.stringify(repetido)),/mais de um cluster/);
 const semTitulo={...base,titulos:{...base.titulos}};delete semTitulo.titulos['c.html'];
 assert.throws(()=>lerConfig(JSON.stringify(semTitulo)),/título ausente/);
 const sobrando={...base,titulos:{...base.titulos,'d.html':'D'}};
 assert.throws(()=>lerConfig(JSON.stringify(sobrando)),/título sem cluster/);
});

test('substitui o bloco gerado, o antigo escrito à mão e o parágrafo "Comece pelos fundamentos"',()=>{
 const bloco=renderBloco('a.html',pequeno);
 const gerado='<article>texto\n'+renderBloco('b.html',pequeno)+'\n</article>';
 assert.equal(aplicarBloco(gerado,bloco).includes(renderBloco('b.html',pequeno)),false);
 assert.match(aplicarBloco(gerado,bloco),/<article>texto/);
 const antigo='<article>texto<h2>Continue explorando a reversa</h2>\n<ul>\n<li>velho</li>\n</ul>\nfim</article>';
 const convertido=aplicarBloco(antigo,bloco);
 assert.equal(convertido.includes('velho'),false);
 assert.match(convertido,/texto<!-- leia-tambem:inicio -->/);
 assert.match(convertido,/fim<\/article>/);
 const umaLinha='<article>texto<p class="guide-related">Comece pelos fundamentos: <a href="/blog/x.html">x</a></p></article>';
 assert.equal(aplicarBloco(umaLinha,bloco).includes('guide-related'),false);
 const semNada='<article>texto</article>';
 assert.match(aplicarBloco(semNada,bloco),/texto<!-- leia-tambem:inicio -->[\s\S]*<!-- leia-tambem:fim -->\n<\/article>/);
});

test('aplicar duas vezes não muda nada na segunda',()=>{
 const bloco=renderBloco('a.html',pequeno);
 const uma=aplicarBloco('<article>texto</article>',bloco);
 assert.equal(aplicarBloco(uma,bloco),uma);
});

test('os artigos publicados estão em dia com o gerador',async()=>{
 const {total,desatualizados}=await aplicar(root,{conferir:true});
 assert.equal(total,config.artigos.length);
 assert.deepEqual(desatualizados,[]);
});

test('todo artigo do blog está mapeado e todo alvo existe em disco',async()=>{
 const noDisco=(await readdir(join(root,'blog')))
  .filter(nome=>nome.endsWith('.html')&&nome!=='index.html');
 assert.deepEqual([...config.artigos].sort(),noDisco.sort());
 for(const slug of config.artigos){
  const html=await readFile(join(root,'blog',slug),'utf8');
  const bloco=html.slice(html.indexOf(INICIO),html.indexOf(FIM)+FIM.length);
  for(const alvo of relacionadosDe(slug,config))assert.ok(bloco.includes('/blog/'+alvo),slug+' sem link para '+alvo);
  assert.equal(bloco.includes('/blog/'+slug),false,slug+' linka para si mesmo');
 }
});
