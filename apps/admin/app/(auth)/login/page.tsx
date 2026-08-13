"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ الدخول..." : "دخول"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold">تسجيل الدخول — لوحة التحكم</h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium">
              رقم الجوال
            </label>
            <Input id="phone" name="phone" type="tel" required autoComplete="tel" dir="ltr" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              كلمة المرور
            </label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton />
        </form>
      </Card>
    </main>
  );
}
