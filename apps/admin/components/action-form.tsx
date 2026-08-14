"use client";

import { useEffect, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, useModalClose } from "@system2026/ui";

export type ActionState = { error?: string; success?: boolean };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel = "حفظ",
  submitPendingLabel = "جارٍ الحفظ...",
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  submitPendingLabel?: string;
  className?: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const closeModal = useModalClose();

  useEffect(() => {
    if (!state.success || !closeModal) return;
    const timer = setTimeout(closeModal, 700);
    return () => clearTimeout(timer);
  }, [state.success, closeModal]);

  return (
    <form action={formAction} className={className}>
      {children}
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-primary">تم الحفظ بنجاح ✓</p> : null}
      <div className="mt-3">
        <SubmitButton label={submitLabel} pendingLabel={submitPendingLabel} />
      </div>
    </form>
  );
}
