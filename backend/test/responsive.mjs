import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function until(fn) {
  for(let i=0;i<100;i++) {
    const result=await fn();
    if(result) return result;
    await delay(100);
  }
  throw new Error('Timed out waiting for browser readiness.');
}

export async function checkLayouts({base,adminPhone,memberPhone,password,memberId}) {
  const profile=await mkdtemp(join(tmpdir(),'ns-browser-'));
  const browser=spawn(process.env.CHROME_BIN,['--headless=new',...(process.env.NS_TEST_ISOLATED_CHROME === '1' ? ['--no-sandbox'] : []),'--disable-breakpad','--disable-crash-reporter','--disable-gpu','--no-first-run','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore',windowsHide:true});
  const closed=once(browser,'close');
  let ws;
  try {
    const port=await until(()=>readFile(join(profile,'DevToolsActivePort'),'utf8').then(s=>s.split(/\r?\n/)[0]).catch(()=>null));
    const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
    await once(ws,'open');
    let id=0;
    const pending=new Map();
    ws.onmessage=e=>{
      const msg=JSON.parse(e.data);
      if(pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id);}
    };
    async function send(method,params={}) {
      const key=++id;
      const reply=new Promise(resolve=>pending.set(key,resolve));
      ws.send(JSON.stringify({id:key,method,params}));
      const msg=await reply;
      if(msg.error) throw new Error(msg.error.message);
      return msg.result;
    }
    const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
    for(const [mobile,pages] of [
      ['', [['/login','Sign in'],['/pay','Download QR code']]],
      [adminPhone,[['/admin','Recent payments'],['/admin/members','Other Member'],['/admin/members/new','Create member'],['/admin/members/'+memberId,'Renew membership'],['/admin/members/'+memberId+'/edit','Save changes'],['/admin/memberships','Test Member'],['/admin/payments','Payment history'],['/admin/settings','Save settings']]],
      [memberPhone,[['/member','Verified payments'],['/member/profile','Test Parent'],['/member/payments','Receipts']]]
    ]) {
      if(mobile) {
        await send('Network.clearBrowserCookies');
        await send('Page.navigate',{url:base+'/login'});
        await until(()=>evaluate('Boolean(document.querySelector("input[name=mobile]"))'));
        for(const [name,text] of [['mobile',mobile],['password',password]]) {
          await evaluate('document.querySelector("input[name='+name+']").focus()');
          await send('Input.insertText',{text});
        }
        await evaluate('document.querySelector("form button").click()');
        await until(()=>evaluate('location.pathname === '+JSON.stringify(pages[0][0])));
      }
      for(const [path,label] of pages) {
        await send('Page.navigate',{url:base+path});
        await until(()=>evaluate('location.pathname === '+JSON.stringify(path)+' && document.body?.innerText.includes('+JSON.stringify(label)+') && !document.body.innerText.includes("Loading.")')).catch(()=>{throw new Error('Did not render '+path)});
        for(const width of [360,768,1440]) {
          await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
          const overflow=await evaluate('document.documentElement.scrollWidth - innerWidth');
          assert.ok(overflow<=1,path+' overflowed by '+overflow+'px at '+width+'px');
        }
      }
    }
    console.log('Passed 13 browser routes at 360, 768 and 1440px.');
  } finally {
    ws?.close();browser.kill();await closed;
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
  }
}

