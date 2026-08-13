"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import { recordPaymentAction, type RecordPaymentActionState } from "./actions";

type Customer = { id: string; name: string; shop_name: string | null };
type UnpaidInvoice = { id: string; invoice_number: number; total_amount: number; status: string };

const METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "check", label: "شيك" },
  { value: "transfer", label: "تحويل بنكي" },
];

const initialState: RecordPaymentActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل التحصيل"}
    </Button>
  );
}

export function PaymentForm({
  customers,
  invoicesByCustomer,
  defaultCustomerId,
}: {
  customers: Customer[];
  invoicesByCustomer: Record<string, UnpaidInvoice[]>;
  defaultCustomerId?: string;
}) {
  const [state, formAction] = useFormState(recordPaymentAction, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const invoices = invoicesByCustomer[customerId] ?? [];

  return (
    <Card className="max-w-md">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">العميل</label>
          <select
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shop_name ?? c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">الفاتورة (اختياري)</label>
          <select
            name="invoiceId"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">بدون ربط بفاتورة محددة</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                فاتورة #{inv.invoice_number} — {inv.total_amount} ر.س ({inv.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">المبلغ</label>
          <Input name="amount" type="number" step="0.01" min="0.01" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">طريقة الدفع</label>
          <select name="method" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-primary">تم تسجيل التحصيل بنجاح ✓</p> : null}

        <SubmitButton />
      </form>
    </Card>
  );
}
