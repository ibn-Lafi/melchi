// روابط التواصل الاجتماعي — تُدار عبر متغيرات بيئة Railway، لا قيم حقيقية هنا
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const socialLinks = {
  whatsapp: WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : "https://wa.me/",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com",
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://tiktok.com",
};
