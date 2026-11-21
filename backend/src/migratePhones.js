import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { normalizeMobile } from './utils/mobile.js';

dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
const apply = process.argv.includes('--apply');

function register(seen, phone, id) {
  if (!phone) throw new Error('Missing or invalid phone for record ' + id);
  if (seen.has(phone)) throw new Error('Conflicting phones on records ' + seen.get(phone) + ' and ' + id);
  seen.set(phone, String(id));
}

async function migrate(db) {
  const users = db.collection('users');
  const members = db.collection('members');
  const profiles = await members.find({}, {projection:{mobile:1}}).toArray();
  const accounts = await users.find({}, {projection:{role:1,memberId:1,mobile:1}}).toArray();
  const memberPhones = new Map();
  const profileOwners = new Map();
  for (const row of profiles) {
    const phone = normalizeMobile(row.mobile);
    register(profileOwners,phone,row._id);
    memberPhones.set(String(row._id),phone);
  }
  const overrides = JSON.parse(process.env.ADMIN_PHONES_JSON || '{}');
  const admins = accounts.filter(u=>u.role==='ADMIN');
  const loginOwners = new Map();
  for (const user of accounts) {
    const adminPhone = user.mobile || overrides[String(user._id)] || (admins.length === 1 && process.env.ADMIN_PHONE);
    const phone = user.role === 'ADMIN' ? normalizeMobile(adminPhone) : memberPhones.get(String(user.memberId));
    if (user.role === 'ADMIN' && profileOwners.has(phone)) throw new Error('Admin phone conflicts with member ' + profileOwners.get(phone));
    register(loginOwners,phone,user._id);
    user.mobile = phone;
  }
  console.log('Validated', accounts.length, 'accounts and', profiles.length, 'profiles.');
  if (!apply) return;
  // Stage new identifiers while the legacy unique indexes still protect existing records.
  // Each stage can be repeated if interrupted. Run with application writers stopped.
  for (const [collection, rows] of [[members,profiles],[users,accounts]]) {
    if (rows.length) await collection.bulkWrite(rows.map(row=>({updateOne:{
      filter:{_id:row._id}, update:{$set:{mobile:normalizeMobile(row.mobile)}},
    }})));
    await collection.createIndex({mobile:1},{unique:true});
    for (const index of await collection.indexes()) {
      if (Object.hasOwn(index.key,'email')) await collection.dropIndex(index.name);
    }
    await collection.updateMany({email:{$exists:true}},{$unset:{email:''}});
  }
  console.log('Phone migration completed.');
}

try {
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000,autoIndex:false});
  await migrate(mongoose.connection.db);
} catch(error) {
  console.error(/^(Conflicting phones|Missing or invalid phone|Admin phone conflicts)/.test(error.message) ? error.message : 'Migration failed. Check database connectivity, permissions and admin phone configuration.');
  process.exitCode=1;
} finally {
  await mongoose.disconnect();
}
