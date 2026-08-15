"use client";

import { useRouter } from "next/navigation";

export function SheetCloseButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="إغلاق"
      onClick={() => router.back()}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
    >
      ✕
    </button>
  );
}
