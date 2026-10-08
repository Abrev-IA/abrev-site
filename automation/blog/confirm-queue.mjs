const base='https://abrev-agentes.tiny-book-1851.chatgpt.site';
const response=await fetch(base+'/api/blog/queue',{signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error('Fila indisponível HTTP '+response.status);
const {jobs}=await response.json();if(!Array.isArray(jobs)||jobs.length>10)throw Error('Fila inválida.');
for(const envelope of jobs){const p=JSON.parse(envelope.data);if(!/^[-a-f0-9]{36}$/.test(p.id))throw Error('Protocolo inválido.');const checked=await fetch(base+'/api/blog/queue/'+p.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(envelope),signal:AbortSignal.timeout(120000)});if(checked.ok){const result=await checked.json();console.log(p.id,result.state);}else if(checked.status===409){console.log(p.id,'Entrega ainda pendente de disponibilização.');}else throw Error('Confirmação HTTP '+checked.status);}
console.log('Confirmação finalizada.');
