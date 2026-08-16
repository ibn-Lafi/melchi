// تصدير عنصر DOM (مستند فاتورة/سند A4) كملف PDF قابل للتنزيل أو المشاركة —
// استيراد html2canvas/jspdf ديناميكيًا (لا يُحمَّل إلا وقت الاستدعاء الفعلي
// بالمتصفح) حتى لا يؤثر على أي استخدام لهذه الحزمة بمكوّنات السيرفر.
export async function generateElementPdf(elementId: string, fileName: string): Promise<File> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`العنصر المطلوب تصديره غير موجود: ${elementId}`);

  // انتظار اكتمال تحميل الخطوط قبل الالتقاط — بدون هذا، قد يلتقط html2canvas
  // العنصر أثناء تبديل الخط الاحتياطي بخط Cairo المتغيّر (خاصة بمتصفحات
  // WebKit/iOS)، ما يُنتج نصًا عربيًا مشوّهًا (حروف بترتيب/شكل خاطئ).
  await document.fonts.ready;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  // letterRendering: true — يرسم كل حرف بموضعه المقاس على حدة بدل الاعتماد
  // على تنفيذ html2canvas الداخلي لتشكيل النص المعقّد (bidi/عربي)، وهو الحل
  // الموثّق لمشكلة تشوّه النص العربي متعدد الأسطر بـ html2canvas خصوصًا مع
  // خطوط متغيّرة (Variable Fonts) على محرك WebKit. الخيار مدعوم فعليًا وقت
  // التشغيل لكنه غائب عن تعريفات TypeScript المرفقة بالحزمة (فجوة معروفة
  // بحزمة html2canvas@1.4.1)، لذا cast محلي موثّق بدل تعطيل الفحص بالكامل.
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    ...({ letterRendering: true } as Record<string, unknown>),
  });
  const imageData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imageHeight;
  let position = 0;
  pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imageHeight;
    pdf.addPage();
    pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
    heightLeft -= pageHeight;
  }

  const blob = pdf.output("blob");
  return new File([blob], `${fileName}.pdf`, { type: "application/pdf" });
}
