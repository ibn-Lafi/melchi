"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import { createReturnAction, type ReturnActionState } from "./actions";

type Customer = { id: string; name: string; shop_name: string | null };
type Product = { id: string; name: string };
type LineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  condition: "resalable" | "damaged" | "expired";
};

const initialState: ReturnActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل المرتجع"}
    </Button>
  );
}

export function ReturnForm({
  customers,
  products,
  defaultCustomerId,
}: {
  customers: Customer[];
  products: Product[];
  defaultCustomerId?: string;
}) {
  const [state, formAction] = useFormState(createReturnAction, initialState);
  const [items, setItems] = useState<LineItem[]>([]);

  function addItem() {
    const first = products[0];
    if (!first) return;
    setItems((prev) => [...prev, { productId: first.id, quantity: 1, unitPrice: 0, condition: "resalable" }]);
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div>
        <label className="mb-1 block text-sm font-medium">العميل</label>
        <select
          name="customerId"
          defaultValue={defaultCustomerId ?? customers[0]?.id}
          required
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <Card key={index} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-3">
              <label className="mb-1 block text-xs">المنتج</label>
              <select
                value={item.productId}
                onChange={(e) => updateItem(index, { productId: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs">الكمية</label>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs">سعر البيع الأصلي</label>
              <Input
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-4">
              <label className="mb-1 block text-xs">الحالة</label>
              <select
                value={item.condition}
                onChange={(e) => updateItem(index, { condition: e.target.value as LineItem["condition"] })}
                className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="resalable">سليم (يرجع لرصيدي)</option>
                <option value="damaged">تالف</option>
                <option value="expired">منتهي الصلاحية</option>
              </select>
            </div>
            <div className="col-span-1">
              <Button type="button" variant="destructive" onClick={() => removeItem(index)}>
                حذف
              </Button>
            </div>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.returnId ? <p className="text-sm text-primary">تم تسجيل المرتجع بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
