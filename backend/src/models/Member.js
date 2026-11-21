import { mobileField } from '../utils/mobile.js';
import mongoose from 'mongoose';

const text = (maxlength) => ({ type: String, required: true, trim: true, maxlength });
const schema = new mongoose.Schema({
  fullName: text(120),
  fatherName: text(120),
  mobile: mobileField,
  address: text(500),
  joiningDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Member', schema);
