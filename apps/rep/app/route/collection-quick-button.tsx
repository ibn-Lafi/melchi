"use client";

import { useCollectionModal } from "../../components/collection-modal-provider";

export function CollectionQuickButton({ customerId }: { customerId: string }) {
  const { openCollectionModal } = useCollectionModal();
  return (
    <button
      type="button"
      onClick={() => openCollectionModal(customerId)}
      className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      تسجيل تحصيل
    </button>
  );
}
