"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Select, useModalClose } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import type { ActionState } from "../../../components/action-form";
import { recordSupplierPaymentAction } from "../payables/actions";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل الدفعة"}
    </Button>
  );
}

// فورم دفعة مخصّص لفاتورة شراء واحدة محددة (supplierId/purchaseInvoiceId
// ثابتان) — يُستخدم كزر "تسجيل دفعة" بجانب كل فاتورة غير مسددة بالكامل،
// بدل الاضطرار لاختيار المورد والفاتورة يدويًا من فورم الدفعة العام.
export function RecordInvoicePaymentForm({
  supplierId,
  purchaseInvoiceId,
  remaining,
}: {
  supplierId: string;
  purchaseInvoiceId: string;
  remaining: number;
}) {
  const [state, formAction] = useFormState(recordSupplierPaymentAction, initialState);
  const closeModal = useModalClose();

  useEffect(() => {
    if (!state.success || !closeModal) return;
    const timer = setTimeout(closeModal, 700);
    return () => clearTimeout(timer);
  }, [state.success, closeModal]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="purchaseInvoiceId" value={purchaseInvoiceId} />
      <p className="text-sm text-foreground/60">
        المتبقي على هذه الفاتورة: <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
      </p>
      <div>
        <label className="mb-1 block text-sm">المبلغ المدفوع</label>
        <Input name="amount" type="number" step="0.01" min="0.01" max={remaining} required />
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
  );
}
