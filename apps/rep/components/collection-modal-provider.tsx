"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@system2026/ui";
import { CollectionFlow } from "../app/collections/collection-flow";
import { getCollectionCustomersAction, type CollectionCustomer } from "../app/collections/actions";

type CollectionModalContextValue = { openCollectionModal: (customerId?: string) => void };

const CollectionModalContext = createContext<CollectionModalContextValue | null>(null);

export function useCollectionModal() {
  const ctx = useContext(CollectionModalContext);
  if (!ctx) throw new Error("useCollectionModal يجب استخدامه داخل CollectionModalProvider");
  return ctx;
}

export function CollectionModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CollectionCustomer[] | null>(null);
  const [defaultCustomerId, setDefaultCustomerId] = useState<string | undefined>(undefined);

  async function openCollectionModal(customerId?: string) {
    setDefaultCustomerId(customerId);
    setOpen(true);
    setLoading(true);
    try {
      const data = await getCollectionCustomersAction();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setCustomers(null);
  }

  function handleCreated(paymentId: string) {
    setOpen(false);
    setCustomers(null);
    router.push(`/collection/${paymentId}`);
  }

  return (
    <CollectionModalContext.Provider value={{ openCollectionModal }}>
      {children}
      <Modal open={open} onClose={handleClose} title="تسجيل تحصيل" size="lg">
        {loading || !customers ? (
          <p className="py-8 text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : customers.length === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <CollectionFlow customers={customers} defaultCustomerId={defaultCustomerId} onCreated={handleCreated} />
        )}
      </Modal>
    </CollectionModalContext.Provider>
  );
}
