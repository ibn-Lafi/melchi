"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@system2026/ui";
import { InvoiceForm } from "../app/invoice/new/invoice-form";
import { getInvoiceModalDataAction, type InvoiceModalData } from "../app/invoice/new/actions";

type InvoiceModalContextValue = { openInvoiceModal: (customerId?: string) => void };

const InvoiceModalContext = createContext<InvoiceModalContextValue | null>(null);

export function useInvoiceModal() {
  const ctx = useContext(InvoiceModalContext);
  if (!ctx) throw new Error("useInvoiceModal يجب استخدامه داخل InvoiceModalProvider");
  return ctx;
}

export function InvoiceModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InvoiceModalData | null>(null);
  const [defaultCustomerId, setDefaultCustomerId] = useState<string | undefined>(undefined);

  async function openInvoiceModal(customerId?: string) {
    setDefaultCustomerId(customerId);
    setOpen(true);
    setLoading(true);
    try {
      const modalData = await getInvoiceModalDataAction();
      setData(modalData);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setData(null);
  }

  function handleCreated(invoiceId: string) {
    setOpen(false);
    setData(null);
    router.push(`/invoice/${invoiceId}`);
  }

  return (
    <InvoiceModalContext.Provider value={{ openInvoiceModal }}>
      {children}
      <Modal open={open} onClose={handleClose} title="فاتورة بيع جديدة" size="lg">
        {loading || !data ? (
          <p className="py-8 text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : data.catalog.length === 0 ? (
          <p className="text-foreground/60">لا يوجد رصيد مخزون متاح حاليًا</p>
        ) : data.customers.length === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <InvoiceForm
            customers={data.customers}
            catalog={data.catalog}
            defaultCustomerId={defaultCustomerId}
            onCreated={handleCreated}
          />
        )}
      </Modal>
    </InvoiceModalContext.Provider>
  );
}
