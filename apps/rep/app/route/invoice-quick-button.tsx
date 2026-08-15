"use client";

import { useInvoiceModal } from "../../components/invoice-modal-provider";

export function InvoiceQuickButton({ customerId }: { customerId: string }) {
  const { openInvoiceModal } = useInvoiceModal();
  return (
    <button
      type="button"
      onClick={() => openInvoiceModal(customerId)}
      className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      فاتورة جديدة
    </button>
  );
}
