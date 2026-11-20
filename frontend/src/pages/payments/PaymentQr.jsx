import { Load } from '../admin/shared.jsx';

export default function PaymentQr() {
  return <section aria-label="Gym payment QR code" className="grid gap-4">
    <h2 className="text-2xl font-semibold">Pay the gym</h2>
    <Load path="/payment-qr">{({upiQrCode}) => upiQrCode ? <>
      <img src={upiQrCode} alt="Gym UPI payment QR code" className="w-72 max-w-full rounded bg-white p-2" />
      <p>Scan with your UPI app to pay.</p>
      <a className="underline" href={upiQrCode} download="NS-Fitness-payment-QR">Download QR code</a>
    </> : <p>The gym has not uploaded a payment QR code yet.</p>}</Load>
  </section>;
}
