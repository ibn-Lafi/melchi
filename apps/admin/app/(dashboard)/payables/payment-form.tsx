"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Select } from "@system2026/ui";
import { recordSupplierPaymentAction } from "./actions";
import type { ActionState } from "../../../components/action-form";

type Supplier = { id: string; name: string };
type UnpaidPurchaseInvoice = { id: string; remaining: number };

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل الدفعة"}
    </Button>
  );
}

export function SupplierPaymentForm({
  suppliers,
  invoicesBySupplier,
}: {
  suppliers: Supplier[];
  invoicesBySupplier: Record<string, UnpaidPurchaseInvoice[]>;
}) {
  const [state, formAction] = useFormState(recordSupplierPaymentAction, initialState);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const invoices = invoicesBySupplier[supplierId] ?? [];

  return (
    <Card className="max-w-md">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm">المورد</label>
          <Select name="supplierId" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm">فاتورة الشراء (اختياري)</label>
          <Select name="purchaseInvoiceId">
            <option value="">بدون ربط بفاتورة محددة</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                متبقٍ {inv.remaining.toFixed(2)} ر.س
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm">المبلغ</label>
          <Input name="amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <label className="mb-1 block text-sm">طريقة الدفع</label>
          <Select name="method">
            <option value="cash">نقدًا</option>
            <option value="check">شيك</option>
            <option value="transfer">تحويل بنكي</option>
          </Select>
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-primary">تم تسجيل الدفعة بنجاح ✓</p> : null}
        <SubmitButton />
      </form>
    </Card>
  );
}
