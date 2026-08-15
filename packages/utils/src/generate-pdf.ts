// تصدير عنصر DOM (مستند فاتورة/سند A4) كملف PDF قابل للتنزيل أو المشاركة —
// استيراد html2canvas/jspdf ديناميكيًا (لا يُحمَّل إلا وقت الاستدعاء الفعلي
// بالمتصفح) حتى لا يؤثر على أي استخدام لهذه الحزمة بمكوّنات السيرفر.
export async function generateElementPdf(elementId: string, fileName: string): Promise<File> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`العنصر المطلوب تصديره غير موجود: ${elementId}`);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
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
