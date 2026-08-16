"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Select, useModalClose } from "@system2026/ui";
import {
  ASSIGNABLE_STAFF_ROLES,
  PERMISSION_LABELS,
  STAFF_ROLE_LABELS,
  permissionsForRole,
  type StaffRole,
} from "../../../../lib/permissions";
import { createStaffUserAction, type ActionState } from "./actions";

const initialState: ActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الإضافة..." : "إضافة المستخدم"}
    </Button>
  );
}

export function CreateUserForm() {
  const [state, formAction] = useFormState(createStaffUserAction, initialState);
  const [role, setRole] = useState<StaffRole>(ASSIGNABLE_STAFF_ROLES[0]!);
  const closeModal = useModalClose();

  useEffect(() => {
    if (!state.success || !closeModal) return;
    const timer = setTimeout(closeModal, 900);
    return () => clearTimeout(timer);
  }, [state.success, closeModal]);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm">الاسم</label>
        <Input name="name" required />
      </div>
      <div>
        <label className="mb-1 block text-sm">البريد الإلكتروني</label>
        <Input name="email" type="email" dir="ltr" required />
      </div>
      <div>
        <label className="mb-1 block text-sm">كلمة المرور</label>
        <Input name="password" type="password" required minLength={6} />
      </div>
      <div>
        <label className="mb-1 block text-sm">الدور</label>
        <Select name="role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {ASSIGNABLE_STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {STAFF_ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-medium text-foreground/60">صلاحيات هذا الدور:</p>
        <ul className="space-y-1 text-sm">
          {permissionsForRole(role).map((p) => (
            <li key={p} className="flex items-center gap-2">
              <span className="text-primary">✓</span> {PERMISSION_LABELS[p]}
            </li>
          ))}
        </ul>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-primary">تم إضافة المستخدم بنجاح ✓</p> : null}
      <SubmitButton />
    </form>
  );
}
