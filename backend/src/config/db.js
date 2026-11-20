import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) throw new Error('Set MONGODB_URI in backend/.env');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
}
