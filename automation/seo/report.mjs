// Relatorio mensal por cluster: agrupa o export do Search Console usando o mesmo
// mapa de clusters que monta o bloco "leia tambem", para que tema signifique a
// mesma coisa no conteudo e na medicao.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {lerConfig} from './related.mjs';

const origin='https://abrev.org';

// O export do Search Console em pt-BR usa virgula decimal e sufixo de porcentagem.
export function parseNumero(valor) {
 const limpo=String(valor).replace(/%/g,'').replace(/\s/g,'').replace(/\.(?=\d{3}\b)/g,'');
 const n=Number(limpo.includes(',')?limpo.replace(/\./g,'').replace(',','.'):limpo);
 if(!Number.isFinite(n))throw Error('número inválido no CSV: '+valor);
 return n;
}

export function parseCsv(texto) {
 const linhas=[];
 let campo='',registro=[],aspas=false;
 const fim=()=>{registro.push(campo);campo='';};
 const fimLinha=()=>{fim();if(registro.some(c=>c!==''))linhas.push(registro);registro=[];};
 for(let i=0;i<texto.length;i++){
  const c=texto[i];
  if(aspas){
   if(c==='"'&&texto[i+1]==='"'){campo+='"';i++;}
   else if(c==='"')aspas=false;
   else campo+=c;
  } else if(c==='"')aspas=true;
  else if(c===',')fim();
  else if(c==='\n')fimLinha();
  else if(c!=='\r')campo+=c;
 }
 fimLinha();
 return linhas;
}

export function lerTabela(texto) {
 const linhas=parseCsv(texto.replace(/^﻿/,''));
 if(linhas.length<2)throw Error('CSV sem linhas de dados');
 return linhas.slice(1).map(([chave,cliques,impressoes,,posicao])=>({
  chave,
  cliques:parseNumero(cliques),
  impressoes:parseNumero(impressoes),
  posicao:parseNumero(posicao),
 }));
}

export function caminhoDe(url) {
 try{const u=new URL(url);return u.origin===origin?u.pathname:null;}catch{return null;}
}

export function clusterDe(url,config) {
 const caminho=caminhoDe(url);
 if(caminho===null)return 'outros';
 const slug=caminho.startsWith('/blog/')?caminho.slice('/blog/'.length):null;
 if(slug&&config.artigos.includes(slug))
  return Object.entries(config.clusters).find(([,membros])=>membros.includes(slug))[0];
 return config.relatorio.caminhos[caminho]??'outros';
}

// Posicao media sempre ponderada por impressao; a media simples mente quando uma
// pagina tem 128 impressoes e outra tem 1.
export function posicaoPonderada(linhas) {
 const impressoes=linhas.reduce((t,l)=>t+l.impressoes,0);
 if(!impressoes)return null;
 return linhas.reduce((t,l)=>t+l.posicao*l.impressoes,0)/impressoes;
}

export function agrupar(linhas,config) {
 const grupos=new Map();
 for(const linha of linhas){
  const cluster=clusterDe(linha.chave,config);
  if(!grupos.has(cluster))grupos.set(cluster,[]);
  grupos.get(cluster).push(linha);
 }
 return [...grupos.entries()]
  .map(([cluster,membros])=>({
   cluster,
   rotulo:config.relatorio.rotulos[cluster]??cluster,
   paginas:membros.length,
   cliques:membros.reduce((t,l)=>t+l.cliques,0),
   impressoes:membros.reduce((t,l)=>t+l.impressoes,0),
   posicao:posicaoPonderada(membros),
   membros,
  }))
  .sort((a,b)=>b.impressoes-a.impressoes||a.cluster.localeCompare(b.cluster));
}

const num=(n,casas=1)=>n===null?'—':n.toFixed(casas).replace('.',',');
const pct=(cliques,impressoes)=>impressoes?num(100*cliques/impressoes)+'%':'—';
const curto=url=>caminhoDe(url)??url;

export function renderRelatorio({periodo,paginas,consultas,config}) {
 const grupos=agrupar(paginas,config);
 const somaCliques=paginas.reduce((t,l)=>t+l.cliques,0);
 const somaImpressoes=paginas.reduce((t,l)=>t+l.impressoes,0);
 const impressoesConsultas=consultas.reduce((t,l)=>t+l.impressoes,0);
 const cobertura=somaImpressoes?100*impressoesConsultas/somaImpressoes:0;
 const declarados=periodo.totaisDeclarados;
 const dias=Math.round((Date.parse(periodo.fim)-Date.parse(periodo.inicio))/86400000)+1;

 const linhasGrupo=grupos.map(g=>`| ${g.rotulo} | ${g.paginas} | ${g.cliques} | ${g.impressoes} | ${pct(g.cliques,g.impressoes)} | ${num(g.posicao)} |`);
 const linhasPagina=[...paginas].sort((a,b)=>b.impressoes-a.impressoes||a.chave.localeCompare(b.chave))
  .map(l=>`| \`${curto(l.chave)}\` | ${config.relatorio.rotulos[clusterDe(l.chave,config)]} | ${l.cliques} | ${l.impressoes} | ${pct(l.cliques,l.impressoes)} | ${num(l.posicao)} |`);
 const linhasConsulta=[...consultas].sort((a,b)=>b.impressoes-a.impressoes||a.chave.localeCompare(b.chave))
  .map(l=>`| ${l.chave} | ${l.cliques} | ${l.impressoes} | ${num(l.posicao)} |`);

 const semClique=[...paginas].filter(l=>l.cliques===0&&l.impressoes>0)
  .sort((a,b)=>b.impressoes-a.impressoes).slice(0,3);
 const piorPosicao=[...paginas].filter(l=>l.impressoes>0)
  .sort((a,b)=>b.posicao-a.posicao).slice(0,3);

 const avisos=[];
 if(declarados&&somaCliques!==declarados.cliques)
  avisos.push(`A soma dos cliques por página (${somaCliques}) não bate com o total declarado pelo Search Console (${declarados.cliques}).`);
 if(declarados&&somaImpressoes!==declarados.impressoes)
  avisos.push(`A soma das impressões por página (${somaImpressoes}) não bate com o total declarado (${declarados.impressoes}).`);
 if(cobertura<50)
  avisos.push(`As consultas listadas cobrem apenas ${num(cobertura)}% das impressões. O Search Console omite consultas raras para preservar anonimato, então nesta faixa de volume a dimensão de consulta serve de indício, não de medida.`);
 const foraDoMapa=grupos.find(g=>g.cluster==='outros');
 if(foraDoMapa)
  avisos.push(`${foraDoMapa.paginas} URL(s) fora do mapa de clusters: ${foraDoMapa.membros.map(l=>'`'+curto(l.chave)+'`').join(', ')}. Acrescente em automation/seo/clusters.json.`);

 return `# Relatório de busca por cluster — ${periodo.inicio} a ${periodo.fim}

Gerado por \`automation/seo/report.mjs\` a partir de \`automation/seo/dados/\`. Não editar à mão: rode o gerador de novo.

- **Período:** ${periodo.inicio} a ${periodo.fim} (${dias} dia(s)).
- **Coletado em:** ${periodo.coletadoEm}.
- **Origem:** ${periodo.origem}.
${periodo.observacao?`- **Observação da coleta:** ${periodo.observacao}\n`:''}
## Totais

| Métrica | Valor |
| --- | --- |
| Cliques | ${somaCliques} |
| Impressões | ${somaImpressoes} |
| CTR | ${pct(somaCliques,somaImpressoes)} |
| Posição média ponderada por impressão | ${num(posicaoPonderada(paginas))} |

## Por cluster

| Cluster | Páginas | Cliques | Impressões | CTR | Posição |
| --- | ---: | ---: | ---: | ---: | ---: |
${linhasGrupo.join('\n')}

## Por página

| Página | Cluster | Cliques | Impressões | CTR | Posição |
| --- | --- | ---: | ---: | ---: | ---: |
${linhasPagina.join('\n')}

## Consultas

| Consulta | Cliques | Impressões | Posição |
| --- | ---: | ---: | ---: |
${linhasConsulta.join('\n')}

## Destaques calculados

- **Mais impressões sem nenhum clique:** ${semClique.length?semClique.map(l=>`\`${curto(l.chave)}\` (${l.impressoes} impressões, posição ${num(l.posicao)})`).join('; '):'nenhuma'}.
- **Piores posições com impressão:** ${piorPosicao.length?piorPosicao.map(l=>`\`${curto(l.chave)}\` (posição ${num(l.posicao)})`).join('; '):'nenhuma'}.

## Avisos

${avisos.length?avisos.map(a=>'- '+a).join('\n'):'- Nenhum.'}
`;
}

async function lerCsv(dir,padrao) {
 const nomes=await readdir(dir);
 const nome=nomes.find(n=>padrao.test(n));
 if(!nome)throw Error('CSV não encontrado em '+dir+' para '+padrao);
 return lerTabela(await readFile(join(dir,nome),'utf8'));
}

// Calcula sem escrever, para que conferir não mexa em arquivo versionado.
export async function relatorioDe(root,mes) {
 const config=lerConfig(await readFile(join(root,'automation/seo/clusters.json'),'utf8'));
 for(const cluster of Object.keys(config.clusters))
  if(!config.relatorio.rotulos[cluster])throw Error('cluster sem rótulo no relatório: '+cluster);
 const dir=join(root,'automation/seo/dados',mes);
 const periodo=JSON.parse(await readFile(join(dir,'periodo.json'),'utf8'));
 const paginas=await lerCsv(dir,/p[aá]ginas\.csv$/i);
 const consultas=await lerCsv(dir,/consultas\.csv$/i);
 return {
  markdown:renderRelatorio({periodo,paginas,consultas,config}),
  destino:join(root,'automation/seo/relatorios',mes+'.md'),
  clusters:agrupar(paginas,config).length,
  paginas:paginas.length,
  consultas:consultas.length,
 };
}

export async function mesesComDados(root) {
 return (await readdir(join(root,'automation/seo/dados'),{withFileTypes:true}))
  .filter(e=>e.isDirectory()&&/^\d{4}-\d{2}$/.test(e.name)).map(e=>e.name).sort();
}

export async function gerar(root,mes) {
 const r=await relatorioDe(root,mes);
 await mkdir(join(root,'automation/seo/relatorios'),{recursive:true});
 await writeFile(r.destino,r.markdown);
 return r;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=process.cwd();
 const conferir=process.argv.includes('--check');
 const alvo=process.argv.slice(2).find(a=>/^\d{4}-\d{2}$/.test(a));
 const meses=alvo?[alvo]:await mesesComDados(root);
 if(!meses.length)throw Error('nenhum mês em automation/seo/dados');
 const desatualizados=[];
 for(const mes of meses){
  const r=await relatorioDe(root,mes);
  if(conferir){
   const atual=await readFile(r.destino,'utf8').catch(()=>null);
   if(atual!==r.markdown)desatualizados.push(mes);
   continue;
  }
  await gerar(root,mes);
  console.log('Relatório',mes+':',r.clusters,'clusters,',r.paginas,'páginas,',r.consultas,'consultas →',r.destino);
 }
 if(desatualizados.length){
  console.error('Relatório desatualizado em: '+desatualizados.join(', ')+'\nRode: node automation/seo/report.mjs '+desatualizados[0]);
  process.exit(1);
 }
 if(conferir)console.log('Relatórios:',meses.length,'mês(es) conferido(s), tudo em dia.');
}
