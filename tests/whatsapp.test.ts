import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { extractMessages, validSignature, sendText } from "../src/lib/whatsapp";

test("assinatura usa corpo bruto e rejeita adulteração, segredo errado e cabeçalho inválido", () => {
 const raw=Buffer.from('{"texto":"olá"}');
 const signature='sha256='+createHmac('sha256','secret').update(raw).digest('hex');
 assert.equal(validSignature(raw,signature,'secret'),true);
 assert.equal(validSignature(Buffer.from('{}'),signature,'secret'),false);
 assert.equal(validSignature(raw,signature,'wrong'),false);
 for(const invalid of [null,'','sha256=bad','sha1=123']) assert.equal(validSignature(raw,invalid,'secret'),false);
});

test("extrai todo o lote e ignora status, números de outro negócio e payloads inválidos", () => {
 const value={metadata:{phone_number_id:'123'},contacts:[{wa_id:'5567999999999',profile:{name:'Gustavo'}}],messages:[
  {id:'m1',from:'5567999999999',type:'text',text:{body:'oi'}},
  {id:'m2',from:'5567999999999',type:'image'},
  {id:'bad',from:'invalid',type:'text',text:{body:'oi'}},
 ]};
 const payload={object:'whatsapp_business_account',entry:[{changes:[{value},{value:{...value,metadata:{phone_number_id:'456'}}}]}]};
 const messages=extractMessages(payload,'123');
 assert.equal(messages.length,2);assert.equal(messages[0].name,'Gustavo');assert.equal(messages[1].text,'');
 for(const bad of [null,{},[],{object:'whatsapp_business_account',entry:[null]}]) assert.deepEqual(extractMessages(bad,'123'),[]);
 assert.deepEqual(extractMessages({object:'whatsapp_business_account',entry:[{changes:[{value:{metadata:{phone_number_id:'123'},statuses:[{id:'sent'}]}}]}]},'123'),[]);
});

test("envio usa token somente no header, reporta falha e exige ID da Meta", async () => {
 const originalFetch=globalThis.fetch;
 const previous={...process.env};
 try {
  Object.assign(process.env,{WHATSAPP_ACCESS_TOKEN:'test-secret',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_API_VERSION:'v99.0'});
  globalThis.fetch=async(url,options)=>{
   assert.equal(String(url),'https://graph.facebook.com/v99.0/123/messages');
   assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer test-secret');
   const body=JSON.parse(String(options?.body));assert.equal(body.to,'5567999999999');assert.equal(body.text.body,'Olá');
   assert.equal(String(options?.body).includes('test-secret'),false);
   return Response.json({messages:[{id:'wamid.test'}]});
  };
  assert.equal(await sendText('5567999999999','Olá'),'wamid.test');
  globalThis.fetch=async()=>Response.json({error:{code:190,message:'sensitive'}},{status:401});
  await assert.rejects(sendText('5567999999999','Olá'),/Meta HTTP 401; código 190/);
  globalThis.fetch=async()=>Response.json({});
  await assert.rejects(sendText('5567999999999','Olá'),/sem ID/);
 } finally {globalThis.fetch=originalFetch;process.env=previous;}
});
