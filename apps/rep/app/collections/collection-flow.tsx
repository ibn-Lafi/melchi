"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Select } from "@system2026/ui";
import {
  recordPaymentAction,
  getCustomerUnpaidInvoicesAction,
  type CollectionCustomer,
  type UnpaidInvoice,
  type RecordPaymentActionState,
} from "./actions";

const METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "check", label: "شيك" },
  { value: "transfer", label: "تحويل بنكي" },
];

const initialState: RecordPaymentActionState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? "جارٍ التسجيل..." : "تسجيل التحصيل"}
    </Button>
  );
}

// تدفّق موجّه: عميل ← فواتيره غير المسددة/المسددة جزئيًا فقط ← مبلغ التحصيل
// (بحد أقصى المتبقي فعليًا) ونوع القبض.
export function CollectionFlow({
  customers,
  defaultCustomerId,
  onCreated,
}: {
  customers: CollectionCustomer[];
  defaultCustomerId?: string;
  onCreated: (paymentId: string) => void;
}) {
  const [state, formAction] = useFormState(recordPaymentAction, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [invoices, setInvoices] = useState<UnpaidInvoice[] | null>(null);
  const [invoiceId, setInvoiceId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state.paymentId) onCreated(state.paymentId);
  }, [state.paymentId, onCreated]);

  useEffect(() => {
    if (!customerId) return;
    setInvoices(null);
    setInvoiceId("");
    setLoading(true);
    getCustomerUnpaidInvoicesAction(customerId)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [customerId]);

  const selectedInvoice = invoices?.find((inv) => inv.id === invoiceId);
  const remaining = selectedInvoice ? selectedInvoice.totalAmount - selectedInvoice.paidAmount : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="customerId" value={customerId} />

      <div>
        <label className="mb-1 block text-sm font-medium">العميل</label>
        <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shopName ?? c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الفاتورة غير المسددة</label>
        {loading ? (
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (invoices?.length ?? 0) === 0 ? (
          <p className="text-sm text-foreground/60">لا توجد فواتير غير مسددة لهذا العميل</p>
        ) : (
          <Select name="invoiceId" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
            <option value="">اختر فاتورة</option>
            {invoices?.map((inv) => (
              <option key={inv.id} value={inv.id}>
                فاتورة #{inv.invoiceNumber} — متبقٍ {(inv.totalAmount - inv.paidAmount).toFixed(2)} ر.س
                {inv.status === "partial" ? " (مسددة جزئيًا)" : ""}
              </option>
            ))}
          </Select>
        )}
      </div>

      {selectedInvoice ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">المبلغ</label>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              defaultValue={remaining?.toFixed(2)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">نوع القبض</label>
            <Select name="method">
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : null}

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <SubmitButton disabled={!invoiceId} />
    </form>
  );
}
