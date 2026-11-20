import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  membershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Membership', required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentDate: { type: Date, required: true },
  method: { type: String, enum: ['Cash', 'UPI', 'Bank transfer'], required: true },
  transactionReference: String,
  entryKey: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['PENDING','PAID','PARTIALLY PAID'], required: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, unique: true, sparse: true },
}, { timestamps: true });
schema.index({ method: 1, transactionReference: 1 }, { unique: true, partialFilterExpression: { transactionReference: { $type: 'string' } } });
export default mongoose.model('Payment', schema);
