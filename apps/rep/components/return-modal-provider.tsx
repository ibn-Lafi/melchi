"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@system2026/ui";
import { ReturnFlow } from "../app/returns/return-flow";
import { getReturnCustomersAction, type ReturnCustomer } from "../app/returns/actions";

type ReturnModalContextValue = { openReturnModal: (customerId?: string) => void };

const ReturnModalContext = createContext<ReturnModalContextValue | null>(null);

export function useReturnModal() {
  const ctx = useContext(ReturnModalContext);
  if (!ctx) throw new Error("useReturnModal يجب استخدامه داخل ReturnModalProvider");
  return ctx;
}

export function ReturnModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<ReturnCustomer[] | null>(null);
  const [defaultCustomerId, setDefaultCustomerId] = useState<string | undefined>(undefined);

  async function openReturnModal(customerId?: string) {
    setDefaultCustomerId(customerId);
    setOpen(true);
    setLoading(true);
    try {
      const data = await getReturnCustomersAction();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setCustomers(null);
  }

  function handleCreated(returnId: string) {
    setOpen(false);
    setCustomers(null);
    router.push(`/return/${returnId}`);
  }

  return (
    <ReturnModalContext.Provider value={{ openReturnModal }}>
      {children}
      <Modal open={open} onClose={handleClose} title="تسجيل مرتجع" size="lg">
        {loading || !customers ? (
          <p className="py-8 text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : customers.length === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <ReturnFlow customers={customers} defaultCustomerId={defaultCustomerId} onCreated={handleCreated} />
        )}
      </Modal>
    </ReturnModalContext.Provider>
  );
}
