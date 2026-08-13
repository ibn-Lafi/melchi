// رقم واتساب الشركة — يُفضَّل نقله لاحقًا لمتغير بيئة عام (NEXT_PUBLIC_WHATSAPP_NUMBER)
// بدل تثبيته هنا مباشرة، فور توفره من صاحب المشروع.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export function buildWhatsAppOrderLink(productName: string): string {
  const message = encodeURIComponent(`أريد طلب المنتج: ${productName}`);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}
