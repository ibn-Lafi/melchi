import QRCode from "qrcode";

// invoices.qr_code_data مُخزَّن جاهزًا بصيغة TLV/Base64 المعتمدة بفاتورة —
// هذه الدالة فقط تحوّله لصورة QR قابلة للعرض/الطباعة، بدون أي منطق توليد بيانات.
export async function renderQrCodeDataUrl(qrCodeData: string): Promise<string> {
  return QRCode.toDataURL(qrCodeData, { margin: 1, width: 200 });
}
