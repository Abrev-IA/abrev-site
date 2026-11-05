const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('assets/analytics.js','utf8');
function setup(consent='accepted',hostname='abrev.org') {
 const handlers={},scripts=[];
 const window={location:{hostname,origin:'https://'+hostname,pathname:'/blog/test.html',href:'https://'+hostname+'/blog/test.html?email=private@example.org#secret'}};
 const context={window,document:{createElement:()=>({}),head:{appendChild:s=>scripts.push(s)},addEventListener:(n,fn)=>handlers[n]=fn},localStorage:{getItem(){if(consent==='throws')throw Error('blocked');return consent;}},WeakSet,URL,Date};
 vm.runInNewContext(source,context);
 return {window,context,handlers,scripts,setConsent:value=>{consent=value;},events:()=>window.dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]}))};
}
test('production initializes once, preview excluded, page URL contains no query or fragment',()=>{
 const x=setup();vm.runInNewContext(source,x.context);assert.equal(x.scripts.length,1);assert.equal(x.window.dataLayer.filter(e=>e[0]==='config').length,1);
 assert.equal(x.window.dataLayer.find(e=>e[0]==='config')[2].page_location,'https://abrev.org/blog/test.html');
 assert.equal(setup('accepted','127.0.0.1').scripts.length,0);
});
test('business events require consent and stop after withdrawal without replay',()=>{
 for(const value of [null,'rejected','throws']){const x=setup(value);x.window.abrevAnalytics.track('abrev_registration_request',{form_id:'community'});assert.equal(x.events().length,0);}
 const x=setup('rejected');x.window.abrevAnalytics.track('abrev_contact_click',{contact_method:'email'});x.setConsent('accepted');assert.equal(x.events().length,0);
 x.window.abrevAnalytics.track('abrev_contact_click',{contact_method:'email'});assert.equal(x.events().length,1);x.setConsent('rejected');x.window.abrevAnalytics.track('abrev_contact_click');assert.equal(x.events().length,1);
});
test('only allowlisted names and fixed labels leave the page',()=>{
 const x=setup();x.window.abrevAnalytics.track('arbitrary',{});assert.equal(x.events().length,0);
 x.window.abrevAnalytics.track('abrev_registration_request',{form_id:'study',email:'private@example.org',nome:'Secret',contact_method:'private@example.org',page_location:'https://example.invalid',link_placement:'secret'});
 const e=x.events()[0];assert.equal(e.params.form_id,'study');assert.equal(e.params.delivery_status,'unconfirmed');assert.equal(JSON.stringify(e).includes('private'),false);assert.equal('page_location' in e.params,false);assert.equal('link_placement' in e.params,false);
});
test('delegated links distinguish form referral from contact intent',()=>{
 const x=setup();for(const [href,name,method] of [['mailto:adm@abrev.org?subject=private','abrev_contact_click','email'],['https://docs.google.com/forms/d/e/test/viewform','abrev_collaboration_click','google_forms'],['https://wa.me/551100000000','abrev_contact_click','whatsapp']]){
 const a={getAttribute:()=>href,closest:s=>s==='footer'?{}:null};x.handlers.click({target:{closest:()=>a}});const e=x.events().at(-1);assert.equal(e.name,name);assert.equal(e.params.contact_method,method);assert.equal(e.params.link_placement,'footer');assert.equal(JSON.stringify(e).includes(href),false);
 }
 const count=x.events().length;x.handlers.click({target:{closest:()=>({getAttribute:()=>'/blog/',closest:()=>null})}});assert.equal(x.events().length,count);
});
test('form start fires once per form and waits for consent',()=>{
 const x=setup('rejected');const form={id:'estudoForm',matches:()=>false};const event={target:{tagName:'INPUT',closest:()=>form}};
 x.handlers.focusin(event);assert.equal(x.events().length,0);x.setConsent('accepted');x.handlers.focusin(event);x.handlers.focusin(event);assert.equal(x.events().length,1);assert.equal(x.events()[0].params.form_id,'study');
});
const eventHtml=fs.readFileSync('evento.html','utf8');
const eventFn=eventHtml.slice(eventHtml.indexOf('function confirmarPresenca(){'),eventHtml.indexOf('\n  </script>',eventHtml.indexOf('function confirmarPresenca(){')));
async function runEvent(outcome,valid=true){
 const events=[];let resolveFetch,rejectFetch,calls=0;
 const nodes={};for(const id of ['nameInput','phoneInput','emailInput','consentCheck','consentLabel','ctaButton','reg-form','success-state','registration-status'])nodes[id]={value:valid?'test':'',checked:true,style:{},classList:{add(){},remove(){}},disabled:false};
 const context={document:{getElementById:id=>nodes[id]},APPS_SCRIPT_URL:'https://example.invalid',window:{abrevAnalytics:{track:(n,p)=>events.push([n,p])}},fetch:()=>{calls++;return new Promise((yes,no)=>{resolveFetch=yes;rejectFetch=no;});},setTimeout:fn=>fn()};
 vm.runInNewContext(eventFn,context);context.confirmarPresenca();context.confirmarPresenca();
 if(valid){if(outcome==='success')resolveFetch({type:'opaque'});else rejectFetch(Error('network'));await new Promise(r=>setImmediate(r));}
 return {events,nodes,calls};
}
test('event form emits once and never shows success on network failure or invalid input',async()=>{
 const ok=await runEvent('success');assert.equal(ok.calls,1);assert.equal(ok.events[0][0],'abrev_registration_request');
 const bad=await runEvent('error');assert.equal(bad.events.length,1);assert.equal(bad.events[0][0],'abrev_registration_error');assert.equal(bad.nodes['success-state'].style.display,undefined);assert.equal(bad.nodes.ctaButton.disabled,false);
 const invalid=await runEvent('success',false);assert.equal(invalid.events.length,0);assert.equal(invalid.calls,0);
});
test('all public inline scripts compile',()=>{
 for(const dir of ['.','blog','imprensa'])for(const name of fs.readdirSync(dir)){
  if(!name.endsWith('.html'))continue;
  const html=fs.readFileSync(dir+'/'+name,'utf8');
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(/application\/ld\+json|\bsrc=/.test(match[1]))continue;
   new vm.Script(match[2],{filename:dir+'/'+name});
  }
 }
});
async function runStudy(outcome,valid=true){
 const html=fs.readFileSync('blog/da-devolucao-ao-encantamento.html','utf8');
 const start=html.indexOf('(function(){',html.indexOf('// Bloco "Receber o estudo completo"'));
 const code=html.slice(start,html.indexOf('</script>',start));
 const events=[];let callback;
 const button={disabled:false,textContent:'Enviar'};
 const status={textContent:''};
 const nodes={eEmail:{value:'qa@example.invalid'},eName:{value:'QA'},eOptin:{checked:false},eStatus:status};
 const form={querySelector:()=>button,reportValidity:()=>valid,addEventListener:(_,fn)=>callback=fn};
 const context={document:{getElementById:id=>id==='estudoForm'?form:nodes[id]},window:{abrevAnalytics:{track:(n,p)=>events.push([n,p])}},postAS:()=>outcome==='success'?Promise.resolve({type:'opaque'}):Promise.reject(Error('network')),artigoTitulo:()=>'',canonUrl:()=>'',slugAtual:()=>''};
 vm.runInNewContext(code,context);await callback({preventDefault(){}});return {events,form,button,status};
}
test('study form distinguishes transport success, failure and invalid fields',async()=>{
 const ok=await runStudy('success');assert.equal(ok.events[0][0],'abrev_registration_request');assert.equal(ok.events[0][1].form_id,'study');
 const bad=await runStudy('failure');assert.equal(bad.events[0][0],'abrev_registration_error');assert.equal(bad.form.innerHTML,undefined);assert.equal(bad.button.disabled,false);
 const invalid=await runStudy('success',false);assert.equal(invalid.events.length,0);
});
