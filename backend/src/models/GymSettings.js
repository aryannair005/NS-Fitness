import mongoose from 'mongoose';
export default mongoose.model('GymSettings', new mongoose.Schema({
  _id: {type:String, default:'gym'},
  ownerName: {type:String, required:true, maxlength:100, default:'Nitesh Shah'},
  contactNumber: {type:String, required:true, maxlength:32, default:'+91 78359 05504'},
  upiId: {type:String, maxlength:150, default:''},
  upiQrCode: {type:String, default:''},
}));
