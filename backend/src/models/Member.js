import mongoose from 'mongoose';

const text = (maxlength) => ({ type: String, required: true, trim: true, maxlength });
const schema = new mongoose.Schema({
  fullName: text(120),
  fatherName: text(120),
  mobile: { ...text(18), match: /^\+?[\d ()-]{7,18}$/ },
  email: { ...text(254), lowercase: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  address: text(500),
  joiningDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Member', schema);
