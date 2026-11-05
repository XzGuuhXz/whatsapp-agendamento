// Somente com o servidor LOCAL e os valores fictícios descritos no README.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
const base=process.env.TEST_BASE_URL??'http://localhost:3100';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Use um servidor local de teste');
const signed=async(body)=>fetch(base+'/api/webhook',{method:'POST',headers:{'x-hub-signature-256':'sha256='+createHmac('sha256','test-app-secret').update(body).digest('hex')},body});
assert.equal((await fetch(base+'/api/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123')).status,403);
const verified=await fetch(base+'/api/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=123');
assert.equal(verified.status,200);assert.equal(await verified.text(),'123');
assert.equal((await fetch(base+'/api/webhook',{method:'POST',body:'{}'})).status,401);
assert.equal((await signed('{')).status,400);
const statuses=JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{value:{metadata:{phone_number_id:'123'},statuses:[{id:'wamid.test',status:'delivered'}]}}]}]});
assert.equal((await signed(statuses)).status,200);
assert.equal((await signed('x'.repeat(1048577))).status,413);
assert.equal((await fetch(base+'/api/outbox',{method:'POST'})).status,401);
console.log('PASS: verificação GET, HMAC, JSON inválido, status sem resposta, limite de corpo e autenticação da fila');
