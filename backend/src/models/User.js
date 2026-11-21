import { mobileField } from '../utils/mobile.js';
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  mobile: mobileField,
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['ADMIN', 'MEMBER'], required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required() { return this.role === 'MEMBER'; } },
  isActive: { type: Boolean, default: true },
  sessionVersion: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('User', schema);
