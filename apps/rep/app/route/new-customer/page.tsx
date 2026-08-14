"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import { AppNav } from "../../../components/nav";
import { createCustomerAction, type CreateCustomerActionState } from "./actions";

const initialState: CreateCustomerActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "إضافة العميل"}
    </Button>
  );
}

export default function NewCustomerPage() {
  const [state, formAction] = useFormState(createCustomerAction, initialState);

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-md p-4 pb-28">
        <h1 className="mb-4 text-xl font-bold">إضافة عميل جديد لخط سيري</h1>
        <Card>
          <form action={formAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">الاسم</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm">اسم المحل</label>
              <Input name="shopName" />
            </div>
            <div>
              <label className="mb-1 block text-sm">الجوال</label>
              <Input name="phone" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm">العنوان</label>
              <Input name="address" />
            </div>
            <div>
              <label className="mb-1 block text-sm">رابط جوجل ماب</label>
              <Input name="googleMapsLink" dir="ltr" placeholder="https://maps.google.com/..." />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <SubmitButton />
          </form>
        </Card>
      </main>
    </div>
  );
}
