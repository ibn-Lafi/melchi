"use client";

import { Button } from "@system2026/ui";

export function PrintButton() {
  return (
    <Button variant="outline" className="no-print" onClick={() => window.print()}>
      طباعة / حفظ PDF
    </Button>
  );
}
