"use client";

import { useReturnModal } from "../../components/return-modal-provider";

export function ReturnQuickButton({ customerId }: { customerId: string }) {
  const { openReturnModal } = useReturnModal();
  return (
    <button
      type="button"
      onClick={() => openReturnModal(customerId)}
      className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      تسجيل مرتجع
    </button>
  );
}
