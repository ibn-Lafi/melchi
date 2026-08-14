"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./button";

// close() يُمرَّر عبر Context (بين مكوّنات client فقط) بدل prop عادي، لأن
// الصفحات (Server Components) لا يمكنها تمرير دوال لمكوّنات client مباشرة.
const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalClose() {
  return useContext(ModalCloseContext);
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ModalCloseContext.Provider value={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
        <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-background p-6 shadow-pop">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalCloseContext.Provider>
  );
}

export function ModalTrigger({
  label,
  title,
  variant = "default",
  children,
}: {
  label: string;
  title: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Modal>
    </>
  );
}
