import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkedItem,checkedMedia,duePending} from './publish-instagram.mjs';
const approved={decision:'APROVADO',score:93,corrections:[],reason:'Dentro do padrão institucional.'};
const item=extra=>({id:'6ad44b32-3bd8-8736-527c-27df00000001',kind:'image',scheduledFor:'2026-11-03',caption:'Novembro é o mês da reversa',media:['https://abrev.org/blog/assets/carrossel-1.jpg'],audit:approved,...extra});

test('Gate do Auditor: só passa APROVADO com score >= 90 e zero correções',()=>{
 assert.equal(checkedItem(item()).verdict.approved,true);
 assert.throws(()=>checkedItem(item({audit:{...approved,score:89}})),/Auditor/);
 assert.throws(()=>checkedItem(item({audit:{...approved,corrections:['Trocar a cor do título']}})),/Auditor/);
 assert.throws(()=>checkedItem(item({audit:{...approved,decision:'DEVOLVIDO'}})),/Auditor/);
 assert.throws(()=>checkedItem(item({audit:null})));
});

test('Mídia só pode vir de https://abrev.org',()=>{
 assert.equal(checkedMedia('https://abrev.org/blog/assets/a.jpg'),'https://abrev.org/blog/assets/a.jpg');
 assert.throws(()=>checkedMedia('http://abrev.org/blog/assets/a.jpg'),/abrev\.org/);
 assert.throws(()=>checkedMedia('https://exemplo.invalido/a.jpg'),/abrev\.org/);
 assert.throws(()=>checkedMedia('nao-e-url'),/inválida/);
});

test('Formato define a quantidade de mídia, e story não aceita legenda',()=>{
 assert.throws(()=>checkedItem(item({kind:'carousel'})),/2 a 10/);
 assert.equal(checkedItem(item({kind:'carousel',media:['https://abrev.org/a.jpg','https://abrev.org/b.jpg']})).media.length,2);
 assert.throws(()=>checkedItem(item({kind:'image',media:['https://abrev.org/a.jpg','https://abrev.org/b.jpg']})),/exatamente uma/);
 assert.throws(()=>checkedItem(item({kind:'story'})),/legenda/);
 assert.throws(()=>checkedItem(item({kind:'stories'})),/desconhecido/);
 assert.throws(()=>checkedItem(item({caption:'x'.repeat(2201)})),/limite/);
});

test('Extensão faz parte do contrato: PNG não passa em feed, nem imagem em Reel',()=>{
 assert.throws(()=>checkedItem(item({media:['https://abrev.org/blog/assets/abrev-logo.png']})),/não aceita/);
 assert.throws(()=>checkedItem(item({kind:'video',media:['https://abrev.org/a.jpg']})),/não aceita/);
 assert.equal(checkedItem(item({kind:'video',media:['https://abrev.org/a.mp4']})).media.length,1);
 assert.equal(checkedItem(item({kind:'story',caption:null,media:['https://abrev.org/a.mov']})).media.length,1);
});

test('A fila versionada no repositório passa pelos mesmos gates',async()=>{
 const queue=JSON.parse(await readFile(new URL('./queue.json',import.meta.url),'utf8'));
 assert.ok(Array.isArray(queue));
 for(const entry of queue)assert.doesNotThrow(()=>checkedItem(entry));
});

test('Só publica o que já venceu e ainda não tem comprovante',()=>{
 const atrasado=item(),futuro=item({id:'6ad44b32-3bd8-8736-527c-27df00000002',scheduledFor:'2026-12-01'});
 assert.equal(duePending([atrasado,futuro],new Set(),'2026-11-05').length,1);
 assert.equal(duePending([atrasado],new Set([atrasado.id]),'2026-11-05').length,0);
 assert.equal(duePending([atrasado],new Set(),'2026-11-01').length,0);
 assert.throws(()=>duePending([atrasado,atrasado],new Set(),'2026-11-05'),/duplicado/);
 assert.throws(()=>duePending(Array.from({length:26},()=>atrasado),new Set(),'2026-11-05'),/limite/);
});
