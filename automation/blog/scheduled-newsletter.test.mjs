import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {planPublication} from './scheduled-newsletter.mjs';
const item=JSON.parse(await readFile(new URL('./scheduled/2026-11-27.json',import.meta.url),'utf8'));
const index='<main id="feed" class="wrap feed">Conteúdo existente</main>';
test('não publica antes de 07h Brasília de 27/11',()=>assert.equal(planPublication(item,index,null,new Date('2026-11-27T09:59:59Z')),null));
test('publica uma vez preservando o índice e não repete',()=>{
 const p=planPublication(item,index,null,new Date('2026-11-27T10:00:00Z'));
 assert.ok(p.index.includes('Conteúdo existente'));
 assert.equal((p.index.match(/data-newsletter=/g)||[]).length,1);
 assert.equal(planPublication(item,p.index,p.html,new Date('2026-11-28')),null);
});
test('bloqueia colisão e índice parcialmente publicado',()=>{
 assert.throws(()=>planPublication(item,index,'Outra publicação',new Date('2026-11-28')));
 assert.throws(()=>planPublication(item,index+item.card,null,new Date('2026-11-28')));
});
