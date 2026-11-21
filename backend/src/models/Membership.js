import mongoose from 'mongoose';

export default mongoose.model('Membership', new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  suspended: { type: Boolean, default: false },
  plan: { type: String, enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Custom'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0, validate(value) {
    const paise = Math.round(value * 100);
    return Number.isSafeInteger(paise) && paise / 100 === value;
  } },
}, { timestamps: true }));
