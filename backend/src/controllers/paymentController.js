import mongoose from 'mongoose';
import Membership from '../models/Membership.js';
import Payment from '../models/Payment.js';

function fail(status, message) { throw Object.assign(new Error(message), {status, expose:true}); }
const cents = value => Math.round(value * 100);

export function paymentInput(body) {
  const { amount, membershipId } = body;
  if (typeof amount !== 'number' || !Number.isSafeInteger(cents(amount)) || amount <= 0 || cents(amount)/100 !== amount) fail(400,'Enter a positive amount with up to two decimal places.');
  if (!mongoose.isObjectIdOrHexString(membershipId)) fail(400,'Choose a membership.');
  const reference = body.transactionReference;
  if (reference != null && (typeof reference !== 'string' || reference.length > 100)) fail(400,'Enter a valid transaction reference.');
  return { membershipId, amount, transactionReference: reference?.trim().toUpperCase() || undefined };
}

export function balance(term, payments) {
  const verified = payments.filter(p => p.status === 'PAID' || p.status === 'PARTIALLY PAID');
  const paid = verified.reduce((sum,p) => sum + cents(p.amount),0);
  const due = Math.max(0,cents(term.amount)-paid);
  return {paid:paid/100, due:due/100, status:due === 0 ? 'PAID' : paid ? 'PARTIALLY PAID' : 'PENDING'};
}

export async function ledger(req,res) {
  const memberId = req.user.role === 'MEMBER' ? req.user.memberId : req.params.memberId;
  if (req.user.role === 'MEMBER' && !memberId) {
    return res.status(403).json({message:'Contact the gym to link your member profile.'});
  }
  res.json(await readLedger(memberId ? {memberId} : {}));
}

export async function readLedger(filter) {
  const [terms,payments] = await Promise.all([
    Membership.find(filter).populate('memberId','fullName').sort({startDate:-1}).lean(),
    Payment.find(filter).sort({paymentDate:-1}).lean(),
  ]);
  return {payments, memberships:terms.map(t => ({...t,...balance(t,payments.filter(p=>String(p.membershipId)===String(t._id)))}))};
}

async function writeReceipt(input, session, existing) {
  // A write on the term serializes simultaneous credits against its balance.
  const term = await Membership.findByIdAndUpdate(input.membershipId, {$inc:{__v:1}}, {session});
  if (!term) fail(404,'Membership not found.');
  const query = {membershipId:term._id};
  if (existing) query._id = {$ne:existing._id};
  const previous = await Payment.find(query).session(session).lean();
  const {due} = balance(term,previous);
  if (input.status !== 'PENDING') {
    if (cents(input.amount)>cents(due)) fail(409,'Amount exceeds the outstanding balance.');
    input.status = cents(input.amount)===cents(due) ? 'PAID' : 'PARTIALLY PAID';
  }
  if (existing) {
    existing.status=input.status;
    return existing.save({session});
  }
  const [receipt] = await Payment.create([{...input,memberId:term.memberId}],{session});
  return receipt;
}

export async function record(req,res) {
  const body=req.body ?? {};
  const input=paymentInput(body);
  if (!['UPI','Cash','Bank transfer'].includes(body.method) || (body.method!=='Cash' && !input.transactionReference)) fail(400,'Choose a method and supply the transfer reference.');
  if (!['PENDING','VERIFIED'].includes(body.status) || typeof body.entryKey!=='string' || !/^[a-f0-9-]{36}$/i.test(body.entryKey)) fail(400,'Invalid receipt status or entry identifier.');
  const day=body.paymentDate;
  const paymentDate=new Date(day+'T00:00:00+05:30');
  if (typeof day!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(+paymentDate) || paymentDate.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})!==day || +paymentDate>Date.now()) fail(400,'Choose a valid payment date up to today.');
  const receipt=await mongoose.connection.transaction(session=>writeReceipt({...input,method:body.method,status:body.status,entryKey:body.entryKey,paymentDate},session));
  res.status(201).json({payment:receipt});
}

export async function updateStatus(req,res) {
  if (!['PENDING','VERIFIED'].includes(req.body?.status)) fail(400,'Invalid payment status.');
  const receipt=await mongoose.connection.transaction(async session=>{
    const existing=await Payment.findById(req.params.id).session(session);
    if (!existing) fail(404,'Payment not found.');
    if (existing.requestId) fail(409,'This receipt belongs to an approved request.');
    return writeReceipt({...existing.toObject(),status:req.body.status},session,existing);
  });
  res.json({payment:receipt});
}

