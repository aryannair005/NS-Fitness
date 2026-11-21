import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { checkLayouts } from './responsive.mjs';
import { ensurePhoneIndexes } from '../src/config/phoneIndexes.js';

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
  const legacy = mongoose.connection.useDb('migration_fixture').db;
  const profiles = legacy.collection('members'), accounts = legacy.collection('users');
  await profiles.createIndex({email:1},{unique:true});
  await accounts.createIndex({email:1},{unique:true});
  const legacyMember = await profiles.insertOne({mobile:'91000 00005',email:'member@example.test'});
  await accounts.insertMany([
    {role:'ADMIN',email:'admin@example.test',passwordHash:'retained'},
    {role:'MEMBER',memberId:legacyMember.insertedId,email:'member@example.test',passwordHash:'retained'},
  ]);
  const runMigration = (...args) => execFileSync(process.execPath, [
    fileURLToPath(new URL('../src/migratePhones.js',import.meta.url)), ...args
  ], {env:{...process.env,MONGODB_URI:uri.replace('/phase8','/migration_fixture')+'?replicaSet='+replica,ADMIN_PHONE:'9100000004',ADMIN_PHONES_JSON:'{}'}});
  runMigration();
  assert.equal(await accounts.countDocuments({mobile:{$exists:true}}),0);
  runMigration('--apply');
  runMigration('--apply');
  for (const collection of [accounts,profiles]) {
    assert.equal(await collection.countDocuments({email:{$exists:true}}),0);
    assert(!(await collection.indexes()).some(index=>index.key.email));
  }
  assert.equal((await accounts.findOne({role:'MEMBER'})).mobile,'+919100000005');
  assert.equal((await accounts.findOne({role:'ADMIN'})).passwordHash,'retained');
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
  const adminPhone='+919100000001', memberPhone='+919100000002';
  await User.create({mobile:adminPhone,passwordHash:await bcrypt.hash(password,4),role:'ADMIN'});
  async function login(mobile) {
    const response=await api('/auth/login','POST',{mobile,password});
    const cookie=response.headers.get('set-cookie');
    assert.match(cookie,/HttpOnly/i); assert.match(cookie,/Secure/i);
    return cookie.split(';')[0];
  }
  let admin=await login(adminPhone);
  const data={fullName:'Test Member',fatherName:'Test Parent',address:'Test address',mobile:memberPhone,password,joiningDate:'2026-01-01',plan:'Monthly',startDate:'2026-01-01',endDate:'2026-01-31',amount:1000};
  const {member}=await (await api('/admin/members','POST',data,admin,201)).json();
  const duplicate = await api('/admin/members','POST',data,admin,409);
  assert.match((await duplicate.json()).message,/phone number/);
  assert.equal((await (await api('/admin/members','GET',undefined,admin)).json()).members.length,1);
  let user=await login(memberPhone.slice(3));
  await api('/admin/dashboard','GET',undefined,user,403);
  await api('/member/profile','GET',undefined,'',401);
  const other={...data,mobile:'+919100000003',fullName:'Other Member'};
  await mongoose.connection.db.collection('members').createIndex({email:1},{unique:true});
  const blocked = await api('/admin/members','POST',other,admin,409);
  assert.match((await blocked.json()).message,/phone migration/);
  await ensurePhoneIndexes(mongoose.connection.db);
  await ensurePhoneIndexes(mongoose.connection.db);
  await api('/admin/members','POST',other,admin,201);
  await api('/admin/members','POST',other,admin,409);
  const self=await (await api('/member/profile?memberId=other','GET',undefined,user)).json();
  assert.equal(self.member.mobile,memberPhone);
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
  if (process.env.CHROME_BIN) await checkLayouts({base,adminPhone,memberPhone,password,memberId:member._id});
  async function verifyPasswordChange(mobile, cookie) {
    const newPassword = randomUUID();
    await api('/auth/password','PATCH',{oldPassword:'incorrect',newPassword},cookie,400);
    await api('/auth/password','PATCH',{oldPassword:password,newPassword:'short'},cookie,400);
    const response = await api('/auth/password','PATCH',{oldPassword:password,newPassword},cookie);
    const renewed = response.headers.get('set-cookie').split(';')[0];
    await api('/auth/me','GET',undefined,cookie,401);
    await api('/auth/me','GET',undefined,renewed);
    await api('/auth/login','POST',{mobile,password},'',401);
    await api('/auth/login','POST',{mobile,password:newPassword});
    return renewed;
  }
  await api('/auth/password','PATCH',{},'',401);
  user = await verifyPasswordChange(memberPhone,user);
  admin = await verifyPasswordChange(adminPhone,admin);
  console.log('Passed password change and session rotation for both roles.');
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
