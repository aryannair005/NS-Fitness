import {Router} from 'express';
import {authenticate,requireRole} from '../middleware/authMiddleware.js';
import * as payments from '../controllers/paymentController.js';
import GymSettings from '../models/GymSettings.js';

const router=Router();
const admin=[authenticate,requireRole('ADMIN')];
const member=[authenticate,requireRole('MEMBER')];
router.get('/payments',admin,payments.ledger);
router.get('/payments/member/:memberId',admin,payments.ledger);
router.get('/member/payments',member,payments.ledger);
router.post('/payments',admin,payments.record);
router.patch('/payments/:id',admin,payments.updateStatus);
router.get('/payment-qr',async(req,res)=>{
  const settings=await GymSettings.findById('gym').select('upiQrCode').lean();
  res.json({upiQrCode:settings?.upiQrCode || ''});
});
router.get('/settings',authenticate,async(req,res)=>{
  res.json({settings:await GymSettings.findById('gym') ?? new GymSettings()});
});
router.put('/settings',admin,async(req,res)=>{
  const {ownerName, contactNumber, upiQrCode}=req.body ?? {};
  if (![ownerName,contactNumber,upiQrCode].every(v=>typeof v==='string') || !ownerName.trim() || !/^[+\d ()-]{7,32}$/.test(contactNumber)) return res.status(400).json({message:'Check the owner name and phone number.'});
  if (upiQrCode) {
    const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+=*)$/.exec(upiQrCode);
    const bytes=match && Buffer.from(match[2],'base64');
    const signature=match?.[1]==='png'?'89504e470d0a1a0a':'ffd8ff';
    if (!bytes || bytes.length>512*1024 || !bytes.toString('hex',0,signature.length/2).startsWith(signature)) return res.status(400).json({message:'Upload a PNG or JPEG QR image up to 512 KB.'});
  }
  const settings=await GymSettings.findByIdAndUpdate('gym',{ownerName:ownerName.trim(),contactNumber,upiQrCode},{upsert:true,new:true,runValidators:true});
  res.json({settings});
});
export default router;
