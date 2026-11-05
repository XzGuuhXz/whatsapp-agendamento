import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3110'],{
 env:{...process.env,WHATSAPP_APP_SECRET:'test-app-secret',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_VERIFY_TOKEN:'test-verify-token'},
 stdio:['ignore','pipe','pipe'],
});
try {
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Startup timeout')),15000);
  child.stdout.on('data',data=>{if(String(data).includes('Ready')){clearTimeout(timer);resolve();}});
  child.stderr.on('data',data=>process.stderr.write(data));
  child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});
 });
 process.env.TEST_BASE_URL='http://127.0.0.1:3110';
 await import('./webhook-http.mjs');
} finally {child.kill('SIGTERM');}
