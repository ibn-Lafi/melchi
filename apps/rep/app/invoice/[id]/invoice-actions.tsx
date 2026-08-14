"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import {
  cancelInvoiceAction,
  requestInvoiceCancelAction,
  type InvoiceRequestActionState,
} from "./actions";

const initialState: InvoiceRequestActionState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function InvoiceActions({
  invoiceId,
  withinGracePeriod,
  hasPendingRequest,
}: {
  invoiceId: string;
  withinGracePeriod: boolean;
  hasPendingRequest: boolean;
}) {
  const [showReasonForm, setShowReasonForm] = useState(false);
  const action = withinGracePeriod ? cancelInvoiceAction : requestInvoiceCancelAction;
  const [state, formAction] = useFormState(action, initialState);

  if (hasPendingRequest) {
    return (
      <Card className="no-print text-sm text-foreground/60">
        يوجد طلب إلغاء معلّق بانتظار موافقة الأدمن.
      </Card>
    );
  }

  if (state.success) {
    return <Card className="no-print text-sm text-primary">تم بنجاح ✓</Card>;
  }

  if (!showReasonForm) {
    return (
      <div className="no-print">
        <Button variant="destructive" onClick={() => setShowReasonForm(true)}>
          {withinGracePeriod ? "إلغاء الفاتورة" : "طلب إلغاء (يحتاج موافقة الأدمن)"}
        </Button>
      </div>
    );
  }

  return (
    <Card className="no-print space-y-3">
      <p className="text-sm text-foreground/60">
        {withinGracePeriod
          ? "لا يزال ضمن فترة السماح — الإلغاء فوري ويعيد البضاعة للمخزون."
          : "انتهت فترة السماح — سيُرسَل الطلب للأدمن للموافقة."}
      </p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div>
          <label className="mb-1 block text-sm">سبب الإلغاء</label>
          <Input name="reason" required />
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <SubmitButton
          label={withinGracePeriod ? "تأكيد الإلغاء" : "إرسال الطلب"}
          pendingLabel="جارٍ الإرسال..."
        />
      </form>
    </Card>
  );
}
