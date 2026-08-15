"use client";

import { useState } from "react";
import { Button } from "@system2026/ui";
import { generateElementPdf } from "@system2026/utils";

// زرا تنزيل/إرسال مشتركان لكل مستندات A4 بتطبيق المندوب (فاتورة، سند قبض،
// إشعار مرتجع) — يلتقطان عنصر الطباعة المخفي خارج الشاشة (id={elementId})
// ويحوّلانه لملف PDF فعلي، بدل عرض المستند بالصفحة نفسها.
export function DocumentPdfActions({
  elementId,
  fileName,
  downloadLabel = "تنزيل الفاتورة",
  shareLabel = "إرسال الفاتورة",
}: {
  elementId: string;
  fileName: string;
  downloadLabel?: string;
  shareLabel?: string;
}) {
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownload() {
    setBusy("download");
    setError(null);
    try {
      const file = await generateElementPdf(elementId, fileName);
      downloadFile(file);
    } catch {
      setError("تعذّر إنشاء ملف PDF، حاول مرة أخرى");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    setError(null);
    try {
      const file = await generateElementPdf(elementId, fileName);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name });
      } else {
        downloadFile(file);
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") setError("تعذّر إرسال الملف");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={handleDownload} disabled={busy !== null}>
          {busy === "download" ? "جارٍ التجهيز..." : downloadLabel}
        </Button>
        <Button type="button" onClick={handleShare} disabled={busy !== null}>
          {busy === "share" ? "جارٍ التجهيز..." : shareLabel}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
