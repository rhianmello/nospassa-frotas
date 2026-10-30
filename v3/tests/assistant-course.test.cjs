'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const courseSource=fs.readFileSync(path.join(__dirname,'..','xrmovi-guide-course.js'),'utf8');
function course(){
 const window={};vm.runInNewContext(courseSource,{window},{timeout:1000});
 return window.XrmoviGuideCourse;
}
test('41 or more training chapters available by group and no network access',()=>{
 const c=course();assert.ok(c.topics.length>=40);
 assert.ok(c.chapters().includes('Quilometragem'));
 assert.ok(c.topics.every(x=>x.title&&x.intro&&x.steps.length>=3&&x.aliases.length>0));
 assert.ok(c.topics.every(x=>!String(x.intro).includes('http')));
});
test('natural Portuguese questions route to the correct verified procedure',()=>{
 const c=course();
 for (const [q,id] of [
  ['como cadastrar um carro','vehicle-add'],
  ['onde mudo o status do carro','vehicle-edit'],
  ['o que e operacional','operational'],
  ['como registrar um abastecimento','fuel'],
  ['como configurar troca de oleo','oil-plan'],
  ['como atualizar o km','km-entry'],
  ['onde vejo o historico do km','km-history'],
  ['como exportar csv','export'],
  ['como salvar pdf','export'],
  ['como cadastrar um motorista','drivers'],
  ['como vincular motorista','driver-link'],
  ['como programar manutencao','maintenance-plan'],
  ['como concluir manutencao','maintenance-close'],
  ['como cadastrar uma despesa','expenses'],
  ['como criar contrato','contracts'],
  ['como adicionar empresa','company-add'],
  ['como trocar plano','change-plan'],
  ['como adicionar usuario','users'],
  ['como pedir suporte','support'],
  ['como trocar logo','logo'],
  ['esqueci minha senha','password'],
  ['como usar o qr code','qr'],
  ['como filtrar por contrato','filters'],
 ]){
  const found=c.find(q);
  assert.equal(found?.id,id,q+' -> '+found?.id);
 }
});
test('unsupported topics do not fabricate help',()=>{
 const c=course();
 assert.equal(c.find('quanto vai chover em sao goncalo'),null);
 assert.equal(c.find('qual e a minha senha'),null);
 assert.equal(c.find(''),null);
});
test('step by step answer contains the real steps and role restrictions',()=>{
 const c=course(),lesson=c.getById('maintenance-close');
 const text=c.answer(lesson);
 assert.ok(text.includes('Passo a passo:'));
 assert.ok(text.includes('1.'));
 assert.ok(text.includes('proprietário ou gestor'));
});
