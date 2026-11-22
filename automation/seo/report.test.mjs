import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNumero,parseCsv,lerTabela,clusterDe,posicaoPonderada,agrupar,renderRelatorio,relatorioDe,mesesComDados} from './report.mjs';
import {lerConfig} from './related.mjs';
import {readFile,writeFile,mkdtemp,mkdir,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const root=new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
const config=lerConfig(await readFile(join(root,'automation/seo/clusters.json'),'utf8'));

test('lê os números como o Search Console em pt-BR os exporta',()=>{
 assert.equal(parseNumero('15%'),15);
 assert.equal(parseNumero('15,4%'),15.4);
 assert.equal(parseNumero('2.8'),2.8);
 assert.equal(parseNumero('8,6'),8.6);
 assert.equal(parseNumero('1.234'),1234);
 assert.equal(parseNumero('0'),0);
 assert.throws(()=>parseNumero('n/d'),/número inválido/);
});

test('o CSV com vírgula dentro de aspas não parte a linha',()=>{
 const linhas=parseCsv('a,b\n"x, y",2\n');
 assert.deepEqual(linhas,[['a','b'],['x, y','2']]);
 assert.deepEqual(parseCsv('a\n"as ""aspas""" \n')[1][0],'as "aspas" ');
 const tabela=lerTabela('P,Cliques,Impressões,CTR,Posição\nhttps://abrev.org/,9,60,"15,4%",2.8\n');
 assert.deepEqual(tabela,[{chave:'https://abrev.org/',cliques:9,impressoes:60,posicao:2.8}]);
});

test('cada URL cai no cluster do mapa, e o que não está no mapa não some',()=>{
 assert.equal(clusterDe('https://abrev.org/blog/logistica-reversa-de-embalagens.html',config),'posconsumo');
 assert.equal(clusterDe('https://abrev.org/blog/glossario-logistica-reversa.html',config),'hub');
 assert.equal(clusterDe('https://abrev.org/',config),'institucional');
 assert.equal(clusterDe('https://abrev.org/imprensa/',config),'imprensa');
 assert.equal(clusterDe('https://abrev.org/pagina-nova.html',config),'outros');
 assert.equal(clusterDe('https://outro-site.com/x.html',config),'outros');
 assert.equal(clusterDe('nao é uma url',config),'outros');
});

test('a posição média é ponderada por impressão, não a média simples',()=>{
 const linhas=[{chave:'a',cliques:0,impressoes:99,posicao:10},{chave:'b',cliques:0,impressoes:1,posicao:100}];
 assert.equal(posicaoPonderada(linhas).toFixed(2),'10.90'); // a média simples daria 55
 assert.equal(posicaoPonderada([]),null);
 assert.equal(posicaoPonderada([{chave:'a',cliques:0,impressoes:0,posicao:5}]),null);
});

test('o agrupamento soma certo e a ordem não depende da ordem de entrada',()=>{
 const linhas=[
  {chave:'https://abrev.org/blog/logistica-reversa-de-embalagens.html',cliques:1,impressoes:47,posicao:7.7},
  {chave:'https://abrev.org/blog/logistica-reversa-de-medicamentos.html',cliques:0,impressoes:1,posicao:89},
  {chave:'https://abrev.org/',cliques:9,impressoes:60,posicao:2.8},
 ];
 const grupos=agrupar(linhas,config);
 assert.deepEqual(grupos.map(g=>g.cluster),['institucional','posconsumo']);
 const pos=grupos.find(g=>g.cluster==='posconsumo');
 assert.equal(pos.cliques,1);
 assert.equal(pos.impressoes,48);
 assert.equal(pos.paginas,2);
 assert.deepEqual(agrupar([...linhas].reverse(),config).map(g=>g.cluster),grupos.map(g=>g.cluster));
});

test('os avisos aparecem quando os números não fecham e somem quando fecham',()=>{
 const periodo={inicio:'2026-11-04',fim:'2026-11-10',coletadoEm:'2026-11-13',origem:'teste',
  totaisDeclarados:{cliques:9,impressoes:60}};
 const paginas=[{chave:'https://abrev.org/',cliques:9,impressoes:60,posicao:2.8}];
 const consultas=[{chave:'abrev',cliques:9,impressoes:60,posicao:2.8}];
 const limpo=renderRelatorio({periodo,paginas,consultas,config});
 assert.match(limpo,/## Avisos\n\n- Nenhum\./);
 const divergente=renderRelatorio({periodo:{...periodo,totaisDeclarados:{cliques:8,impressoes:59}},paginas,consultas,config});
 assert.match(divergente,/soma dos cliques por página \(9\).*\(8\)/);
 assert.match(divergente,/soma das impressões por página \(60\).*\(59\)/);
 const poucasConsultas=renderRelatorio({periodo,paginas,consultas:[{chave:'abrev',cliques:0,impressoes:1,posicao:3}],config});
 assert.match(poucasConsultas,/cobrem apenas 1,7% das impressões/);
 const foraDoMapa=renderRelatorio({periodo,paginas:[...paginas,{chave:'https://abrev.org/nova.html',cliques:0,impressoes:1,posicao:9}],consultas,config});
 assert.match(foraDoMapa,/fora do mapa de clusters: `\/nova\.html`/);
});

test('todo cluster tem rótulo no relatório',()=>{
 for(const cluster of Object.keys(config.clusters))
  assert.ok(config.relatorio.rotulos[cluster],'sem rótulo: '+cluster);
 for(const cluster of Object.values(config.relatorio.caminhos))
  assert.ok(config.relatorio.rotulos[cluster],'sem rótulo: '+cluster);
});

test('acompanha a quebra de linha do arquivo, senão o --check acusa sempre no Windows',async()=>{
 const temporario=await mkdtemp(join(tmpdir(),'abrev-relatorio-'));
 try{
  await mkdir(join(temporario,'automation/seo/relatorios'),{recursive:true});
  await cp(join(root,'automation/seo/clusters.json'),join(temporario,'automation/seo/clusters.json'));
  await cp(join(root,'automation/seo/dados/2026-11'),join(temporario,'automation/seo/dados/2026-11'),{recursive:true});
  const destino=join(temporario,'automation/seo/relatorios/2026-11.md');

  const semArquivo=await relatorioDe(temporario,'2026-11');
  assert.equal(semArquivo.markdown.includes('\r\n'),false,'sem arquivo anterior deve sair em LF');

  await writeFile(destino,semArquivo.markdown.replace(/\n/g,'\r\n'));
  const comCrlf=await relatorioDe(temporario,'2026-11');
  assert.ok(comCrlf.markdown.includes('\r\n'),'arquivo em CRLF deve ser regerado em CRLF');
  assert.equal(comCrlf.markdown,await readFile(destino,'utf8'),'o --check acusaria desatualizado sem motivo');

  await writeFile(destino,semArquivo.markdown);
  const comLf=await relatorioDe(temporario,'2026-11');
  assert.equal(comLf.markdown.includes('\r\n'),false,'arquivo em LF deve continuar em LF');
 } finally {
  await rm(temporario,{recursive:true,force:true});
 }
});

test('os relatórios publicados estão em dia com os dados e com o gerador',async()=>{
 const meses=await mesesComDados(root);
 assert.ok(meses.length,'nenhum mês de dados');
 for(const mes of meses){
  const {markdown,destino}=await relatorioDe(root,mes);
  const publicado=await readFile(destino,'utf8').catch(()=>null);
  assert.equal(publicado,markdown,mes+': relatório desatualizado, rode node automation/seo/report.mjs '+mes);
 }
});
