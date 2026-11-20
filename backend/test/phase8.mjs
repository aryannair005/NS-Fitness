import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { checkLayouts } from './responsive.mjs';

const dbDir = await mkdtemp(join(tmpdir(), 'ns-fitness-test-'));
const reservation = createServer().listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const replica = 'test' + randomBytes(6).toString('hex');
const mongo = spawn(process.env.MONGOD_BIN || 'mongod', ['--dbpath', dbDir, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', replica], { stdio:'ignore', windowsHide:true });
const closed = once(mongo,'close');
let server;
try {
  await once(mongo,'spawn');
  const uri = 'mongodb://127.0.0.1:'+port+'/phase8';
  const bootstrap = await mongoose.createConnection(uri+'?directConnection=true',{serverSelectionTimeoutMS:15000}).asPromise();
  try {
    await bootstrap.db.admin().command({replSetInitiate:{_id:replica,members:[{_id:0,host:'127.0.0.1:'+port}]}});
  } finally {await bootstrap.close();}
  await mongoose.connect(uri+'?replicaSet='+replica,{serverSelectionTimeoutMS:15000});
  process.env.NODE_ENV='production';
  process.env.JWT_SECRET=randomBytes(48).toString('hex');
  const {default:app}=await import('../app.js');
  const {default:User}=await import('../src/models/User.js');
  await Promise.all(mongoose.modelNames().map(name=>mongoose.model(name).init()));
  server=app.listen(0,'127.0.0.1');
  await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  process.env.CLIENT_ORIGIN=base;
  async function api(path, method='GET', body, cookie='', expected=200) {
    const response=await fetch(base+'/api'+path,{method,headers:{cookie,origin:base,'content-type':'application/json'},body:JSON.stringify(body)});
    assert.equal(response.status,expected,method+' '+path+' returned '+response.status);
    return response;
  }
  const password=randomUUID();
  const adminEmail='owner@example.test', memberEmail='member@example.test';
  await User.create({email:adminEmail,passwordHash:await bcrypt.hash(password,4),role:'ADMIN'});
  async function login(email) {
    const response=await api('/auth/login','POST',{email,password});
    const cookie=response.headers.get('set-cookie');
    assert.match(cookie,/HttpOnly/i); assert.match(cookie,/Secure/i);
    return cookie.split(';')[0];
  }
  const admin=await login(adminEmail);
  const data={fullName:'Test Member',fatherName:'Test Parent',address:'Test address',mobile:'9999999999',email:memberEmail,password,joiningDate:'2026-01-01',plan:'Monthly',startDate:'2026-01-01',endDate:'2026-01-31',amount:1000};
  const {member}=await (await api('/admin/members','POST',data,admin,201)).json();
  await api('/admin/members','POST',data,admin,409);
  assert.equal((await (await api('/admin/members','GET',undefined,admin)).json()).members.length,1);
  const user=await login(memberEmail);
  await api('/admin/dashboard','GET',undefined,user,403);
  await api('/member/profile','GET',undefined,'',401);
  const other={...data,email:'other@example.test',fullName:'Other Member'};
  await api('/admin/members','POST',other,admin,201);
  const self=await (await api('/member/profile?memberId=other','GET',undefined,user)).json();
  assert.equal(self.member.email,memberEmail);
  const renewal={memberId:member._id,startDate:'2026-02-01',plan:'Quarterly',amount:2000};
  const {membership:term}=await (await api('/memberships','POST',renewal,admin,201)).json();
  assert.equal(term.endDate.slice(0,10),'2026-04-30');
  await api('/memberships','POST',renewal,admin,409);
  const payment={membershipId:term._id,amount:750,method:'Cash',status:'VERIFIED',entryKey:randomUUID(),paymentDate:'2026-02-01'};
  await api('/payments','POST',payment,admin,201);
  const ledger=await (await api('/member/payments','GET',undefined,user)).json();
  assert.equal(ledger.memberships.length,2); assert.equal(ledger.payments.length,1);
  assert.equal(ledger.memberships.find(t=>t._id===term._id).due,1250);
  const settings={ownerName:'Test Owner',contactNumber:'9999999999',upiQrCode:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVQAAAABJRU5ErkJggg=='};
  await api('/settings','PUT',settings,user,403);
  await api('/settings','PUT',settings,admin);
  assert.deepEqual(await (await api('/payment-qr')).json(),{upiQrCode:settings.upiQrCode});
  await api('/nonexistent','GET',undefined,'',404);
  console.log('Passed live API checks with a disposable MongoDB replica set.');
  if (process.env.CHROME_BIN) await checkLayouts({base,adminEmail,memberEmail,password,memberId:member._id});
  await api('/admin/members/'+member._id+'/deactivate','PATCH',{},admin,204);
  await api('/member/profile','GET',undefined,user,401);
  await api('/auth/logout','POST',{},admin,204);
  await api('/admin/dashboard','GET',undefined,admin,401);
  console.log('Passed deactivation and logout checks.');
} finally {
  if(server) await new Promise(resolve=>server.close(resolve));
  await mongoose.disconnect();
  mongo.kill();
  await closed;
  await rm(dbDir,{recursive:true,force:true,maxRetries:4,retryDelay:200});
}
